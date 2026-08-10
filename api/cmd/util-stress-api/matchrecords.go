package main

import (
	"fmt"
	"sync"
	"sync/atomic"
	"time"
)

func stressMatchRecords() {
	totalNumRequests := uint64(*fNumRequests)
	concurrency := int(*fConcurrency)

	var reqCount uint64 = 0
	var wg sync.WaitGroup

	// Do stress
	// TODO: the time calculation isn't just on requests, it incorporates
	// a bunch of stuff, so its misleading to the total server-processing
	// time, but that is okay
	start := time.Now()

	authCtx := serviceTokenContext()
	requestBody := string(randomData(10000))

	for c := 0; c < concurrency; c++ {
		wg.Add(1)
		client := apiClient()

		go func(worker int) {
			defer wg.Done()

			index := 0

			for {
				if reqCount >= totalNumRequests {
					return
				}

				_, recordURI, err := client.InternalAppendMatchArchiveRecords(authCtx, uint64(100+worker), int64(index), requestBody)
				if err != nil {
					fmt.Println("Err!", err)
					return
				}
				_ = recordURI
				fmt.Println("->", recordURI)

				index++
				atomic.AddUint64(&reqCount, 1)
			}
		}(c)
	}

	wg.Wait()
	end := time.Now()

	report(reqCount, end.Sub(start).Milliseconds())
}
