package metrics

import (
	"fmt"
	"time"

	"github.com/go-chi/telemetry"

	"github.com/horizon-games/OpenSky/api/data"
	"github.com/horizon-games/OpenSky/api/lib/jobqueue"
	"github.com/horizon-games/OpenSky/api/proto"
)

var matchEndDurationBuckets = []float64{
	1 * 60,
	2.5 * 60,
	5 * 60,
	7.5 * 60,
	10 * 60,
	15 * 60,
	20 * 60,
	30 * 60,
}

type PrometheusCollector struct {
	*jobqueueNamespace
	*openskyNamespace
}

func NewPrometheusCollector() *PrometheusCollector {
	return &PrometheusCollector{
		jobqueueNamespace: newJobqueueNamespace(),
		openskyNamespace:  newOpenSkyNamespace(),
	}
}

type jobqueueNamespace struct {
	namespace *telemetry.Namespace
}

func newJobqueueNamespace() *jobqueueNamespace {
	return &jobqueueNamespace{
		namespace: telemetry.NewNamespace("jobqueue"),
	}
}

func (n *jobqueueNamespace) TrackTasksAttempt(runner jobqueue.Runner, tasks []*data.Task) {
	startTime := time.Now().UTC()

	for _, task := range tasks {
		if task.Try > 0 {
			n.namespace.RecordIntegerValue("retried_tasks", map[string]string{
				"workgroup": runner.WorkGroup(),
				"queue":     task.Queue,
			}, int(task.Try)) // record number of tries before increasing the counter
		} else {
			// first try (counter)
			n.namespace.RecordHit("first_try_tasks", map[string]string{
				"workgroup": runner.WorkGroup(),
				"queue":     task.Queue,
			})
			// first try (queue lag)
			n.namespace.RecordDuration("first_try_tasks", map[string]string{
				"workgroup": runner.WorkGroup(),
				"queue":     task.Queue,
			}, *task.Task.RunAt, startTime)
		}
	}
}

func (n *jobqueueNamespace) TrackTaskDuration(runner jobqueue.Runner, task *data.Task) {
	stopTime := time.Now().UTC()

	tags := map[string]string{
		"workgroup": runner.WorkGroup(),
		"queue":     task.Queue,
	}

	// record the number of attempts on specific buckets: we care about the 1st
	// and 2nd attempts but beyond the 5th is something equally undesirable.
	n.namespace.RecordValueWithBuckets("tried_tasks", tags, float64(task.Try), []float64{1, 2, 3, 4, 5})

	if task.Task.Status == proto.TaskStatus_FAILED {
		// task exceeded the number of retries
		n.namespace.RecordHit("failed_tasks", tags)

		// record how much time it took this task to fail the last time
		n.namespace.RecordDuration("failed_tasks", tags, *task.LastRanAt, stopTime)
	} else {
		tags["status"] = task.Task.Status.String()

		// record how much time it took for this task to be completed (ignoring retries)
		n.namespace.RecordDuration("completed_tasks", tags, *task.LastRanAt, stopTime)
	}
}

func (n *jobqueueNamespace) TrackTxMintingDuration(status string, submittedAt time.Time) {
	n.namespace.RecordDuration("metatxn_transaction", map[string]string{
		"status": status,
	}, submittedAt, time.Now().UTC())
}

func (n *jobqueueNamespace) TrackLastBlockNumber(process string, blockNumber uint64) {
	n.namespace.RecordGauge("last_block_number", map[string]string{
		"process": process,
	}, float64(blockNumber))
}

type openskyNamespace struct {
	namespace *telemetry.Namespace
}

func newOpenSkyNamespace() *openskyNamespace {
	return &openskyNamespace{
		namespace: telemetry.NewNamespace("opensky"),
	}
}

func (n *openskyNamespace) TrackSkypassClaim(reward *data.SkypassReward) {
	if reward == nil {
		return
	}

	n.namespace.RecordHit("skypass_claim", map[string]string{
		"item_type":  reward.ItemType.String(),
		"tier":       reward.Tier.String(),
		"is_starter": fmt.Sprintf("%t", reward.IsStarter),
	})
}

func (n *openskyNamespace) TrackPayment(provider proto.PaymentProvider, status proto.PaymentStatus, productCode string, quantity uint64, paidIn proto.ItemType) {
	for i := 1; i <= int(quantity); i++ {
		n.namespace.RecordHit("payment", map[string]string{
			"provider":     provider.String(),
			"status":       status.String(),
			"product_code": productCode,
			"paid_in":      paidIn.String(),
		})
	}
}

func (n *openskyNamespace) TrackConquestPoolAmount(poolAmount uint64) {
	n.namespace.RecordGauge("conquest_pool_amount", nil, float64(poolAmount))
}

func (n *openskyNamespace) TrackConquestTotalWeight(totalWeight float32) {
	n.namespace.RecordGauge("conquest_total_weight", nil, float64(totalWeight))
}

func (n *openskyNamespace) TrackConquestTotalWeightPriceTop(totalWeightPriceTop uint64) {
	n.namespace.RecordGauge("conquest_total_weight_price_top", nil, float64(totalWeightPriceTop))
}

func (n *openskyNamespace) TrackConquestTotalWeightPriceBottom(totalWeightPriceBottom uint64) {
	n.namespace.RecordGauge("conquest_total_weight_price_bottom", nil, float64(totalWeightPriceBottom))
}

func (n *openskyNamespace) TrackConquestWeightUnitPrice(weightUnitPrice float32) {
	n.namespace.RecordGauge("conquest_weight_unit_price", nil, float64(weightUnitPrice))
}

func (n *openskyNamespace) TrackMatchEnd(match *data.Match) {
	if match == nil {
		return
	}

	n.namespace.RecordIntegerValue("match_end_nonce", map[string]string{
		"status": match.Status.String(),
		"mode":   match.Mode(),
	}, int(match.TurnNonce))

	if match.StartedAt != nil && match.EndedAt != nil {
		duration := match.EndedAt.Sub(*match.StartedAt)

		n.namespace.RecordValueWithBuckets("match_end_duration_seconds", map[string]string{
			"status": match.Status.String(),
			"mode":   match.Mode(),
		}, float64(duration/time.Second), matchEndDurationBuckets)
	}
}

func (n *openskyNamespace) TrackConquestEntered(hero proto.Hero) {
	n.namespace.RecordHit("conquest_entered", map[string]string{
		"hero": hero.String(),
	})
}

func (n *openskyNamespace) TrackConquestExited(wins int) {
	n.namespace.RecordHit("conquest_exited", map[string]string{
		"wins": fmt.Sprintf("%d", wins),
	})
}

func (n *openskyNamespace) TrackConquestCompleted() {
	n.namespace.RecordHit("conquest_completed", map[string]string{})
}

func (n *openskyNamespace) TrackQuestAutoReRoll(periodicity proto.QuestPeriodicity, position data.QuestPosition) {
	n.namespace.RecordHit("quest_auto_reroll", map[string]string{
		"periodicity": periodicity.String(),
		"position":    fmt.Sprintf("%d", position),
	})
}

func (n *openskyNamespace) TrackQuestManualReRoll(periodicity proto.QuestPeriodicity, position data.QuestPosition, reroll uint16) {
	n.namespace.RecordHit("quest_manual_reroll", map[string]string{
		"periodicity": periodicity.String(),
		"position":    fmt.Sprintf("%d", position),
		"reroll":      fmt.Sprintf("%d", reroll),
	})
}

func (n *openskyNamespace) TrackQuestManualClaim(periodicity proto.QuestPeriodicity) {
	n.namespace.RecordHit("quest_manual_claim", map[string]string{
		"periodicity": periodicity.String(),
	})
}

func (n *openskyNamespace) TrackQuestMoveUpInEpic(periodicity proto.QuestPeriodicity, position data.QuestPosition) {
	n.namespace.RecordHit("quest_move_up_in_epic", map[string]string{
		"periodicity": periodicity.String(),
		"position":    fmt.Sprintf("%d", position),
	})
}

func (n *openskyNamespace) TrackQuestCopyToCurrentPeriod(periodicity proto.QuestPeriodicity, position data.QuestPosition) {
	n.namespace.RecordHit("quest_copy_to_current_period", map[string]string{
		"periodicity": periodicity.String(),
		"position":    fmt.Sprintf("%d", position),
	})
}
