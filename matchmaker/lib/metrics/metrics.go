package metrics

import (
	"time"

	"github.com/go-chi/telemetry"
	"github.com/horizon-games/OpenSky/api/proto"
)

var metrics = telemetry.NewNamespace("matchmaker")

func RecordTotalClients(size int) {
	metrics.RecordSize("clients", map[string]string{
		// "instance": "", // TODO: add instance name (when using more than 1 matchmaker services)
	}, float64(size))
}

func RecordQueueSize(name string, size int) {
	metrics.RecordSize("queue", map[string]string{
		"name": name,
		// "instance": "", // TODO: add instance name (when using more than 1 matchmaker services)
	}, float64(size))
}

func RecordCommand(name string, mode proto.GameMode) {
	metrics.RecordHit("command", map[string]string{
		"name":  name,
		"queue": mode.String(),
	})
}

func RecordSessionDuration(start, stop time.Time) {
	metrics.RecordDurationWithResolution("session", map[string]string{
		"module": "ws",
	}, start, stop, time.Second*20)
}

func RecordTotalWaitTime(mode proto.GameMode, start, stop time.Time) {
	metrics.RecordDurationWithResolution("total_wait_time", map[string]string{
		"queue": mode.String(),
	}, start, stop, time.Second*1)
}

func RecordQueueWaitTime(mode proto.GameMode, start, stop time.Time) {
	metrics.RecordDurationWithResolution("queue_wait_time", map[string]string{
		"queue": mode.String(),
	}, start, stop, time.Second*1)
}
