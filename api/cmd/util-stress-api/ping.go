package main

import (
	"context"
	"fmt"
	"sync"
	"sync/atomic"
	"time"
)

func stressPing() {
	totalNumRequests := uint64(*fNumRequests)
	concurrency := int(*fConcurrency)

	var reqCount uint64 = 0
	var wg sync.WaitGroup

	// Do stress
	start := time.Now()

	for c := 0; c < concurrency; c++ {
		wg.Add(1)
		client := apiClient()

		go func() {
			defer wg.Done()
			for {
				if reqCount >= totalNumRequests {
					return
				}

				_, err := client.Ping(context.Background())
				if err != nil {
					fmt.Println("failed:", err)
					return
				}

				atomic.AddUint64(&reqCount, 1)
			}
		}()
	}

	wg.Wait()
	end := time.Now()

	report(reqCount, end.Sub(start).Milliseconds())
}
