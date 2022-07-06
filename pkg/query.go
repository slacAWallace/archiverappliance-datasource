package main

import (
	"context"
	"regexp"
	"strconv"
	"time"

	"github.com/grafana/grafana-plugin-sdk-go/backend"
	"github.com/grafana/grafana-plugin-sdk-go/backend/log"
)

func IsBackendQuery(pluginctx backend.PluginContext) bool {
	// Return true if this query was created by the backend as opposed to visualization query for the frontend
	return pluginctx.User != nil
}

func Query(ctx context.Context, qm ArchiverQueryModel, client *AAclient) backend.DataResponse {
	response := backend.DataResponse{}

	// make the query and compile the results into a SingleData instance
	var targetPvList []string
	if qm.Regex {
		// If the user is using a regex to specify the PVs, parse and resolve the regex expression first
		// assemble the list of PVs to be queried for
		targetPvList, _ = client.FetchRegexTargetPVs(qm.Target)
	} else {
		// If a regex is not being used, only check for listed PVs
		targetPvList = IsolateBasicQuery(qm.Target)
	}

	// execute the individual queries
	responseData := make([]*SingleData, 0, len(targetPvList))
	responsePipe := make(chan SingleData)

	// Create timeout. If any request routines take longer than timeoutDurationSeconds to execute, they will be dropped.
	timeoutDurationSeconds := 30 // units are seconds
	timeoutDuration, _ := time.ParseDuration(strconv.Itoa(timeoutDurationSeconds) + "s")
	timeoutPipe := time.After(timeoutDuration)

	// create goroutines for individual requests
	for _, targetPv := range targetPvList {
		go func(targetPv string, pipe chan SingleData) {
			parsedResponse, _ := client.ExecuteSingleQuery(targetPv, qm)
			pipe <- parsedResponse
		}(targetPv, responsePipe)
	}

	// Collect responses from the request goroutines
responseCollector:
	for range targetPvList {
		select {
		case response := <-responsePipe:
			responseData = append(responseData, &response)
		case <-timeoutPipe:
			log.DefaultLogger.Warn("Timeout limit for query has been reached")
			break responseCollector
		}
	}

	// Apply Alias to the data
	var aliasErr error
	responseData, aliasErr = ApplyAlias(responseData, qm)
	if aliasErr != nil {
		log.DefaultLogger.Warn("Error applying alias")
	}

	// Apply Functions to the data
	var funcErr error
	responseData, funcErr = ApplyFunctions(responseData, qm)
	if funcErr != nil {
		log.DefaultLogger.Warn("Error applying functions")
	}

	// Extrapolate data as necessary
	for idx, data := range responseData {
		responseData[idx] = DataExtrapol(data, qm)
	}

	// for each query response, compile the data into response.Frames
	for _, singleResponse := range responseData {

		frame := singleResponse.ToFrame()

		// add the frames to the response
		response.Frames = append(response.Frames, frame)
	}

	return response
}

func ApplyAlias(sD []*SingleData, qm ArchiverQueryModel) ([]*SingleData, error) {
	// Alias is not set. Return data as is is.
	if qm.Alias == "" {
		return sD, nil
	}

	var rep *regexp.Regexp
	if qm.AliasPattern != "" {
		var err error
		rep, err = regexp.Compile(qm.AliasPattern)
		if err != nil {
			return sD, err
		}
	}

	for _, d := range sD {
		d.ApplyAlias(qm.Alias, rep)
	}

	return sD, nil
}

func DataExtrapol(singleResponse *SingleData, qm ArchiverQueryModel) *SingleData {
	disableExtrapol, err := qm.DisableExtrapol()
	if err != nil {
		disableExtrapol = false
	}

	if (qm.Operator != "raw") || disableExtrapol {
		return singleResponse
	}

	newResponse := singleResponse.Extrapolation(qm.TimeRange.To)

	return newResponse
}
