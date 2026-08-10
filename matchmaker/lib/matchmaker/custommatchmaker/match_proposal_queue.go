package custommatchmaker

import (
	"fmt"

	"github.com/horizon-games/OpenSky/api/proto"
	"github.com/horizon-games/OpenSky/matchmaker/lib/matchmaker"
	"github.com/horizon-games/OpenSky/matchmaker/lib/queue"
)

const queueNameFmt = "match_proposal:%s:%d"

//go:generate go run go.uber.org/mock/mockgen -destination ./mock/accepted_match_proposal_queue.go -package mock . AcceptedMatchProposalQueue
type AcceptedMatchProposalQueue interface {
	Push(*matchmaker.MatchProposal) error
	Items(proto.GameMode) (proposalIDs []string, err error)
	Remove(proposalID string, gameMode proto.GameMode) error
}

type matchProposalQueue struct {
	queueDistributor queue.Distributor
	status           matchmaker.MatchProposalStatus
}

func NewMatchProposalQueue(queueDistributor queue.Distributor, status matchmaker.MatchProposalStatus) *matchProposalQueue {
	return &matchProposalQueue{
		queueDistributor: queueDistributor,
		status:           status,
	}
}

func (q *matchProposalQueue) Push(proposal *matchmaker.MatchProposal) error {
	items := q.createQueueItems(proposal)

	for _, item := range items {
		if err := q.queueDistributor.Push(item); err != nil {
			return fmt.Errorf("push: %w", err)
		}
	}

	return nil
}

func (q *matchProposalQueue) Items(gameMode proto.GameMode) (proposalIDs []string, err error) {
	proposalQueue := newProposalQueue(q.status, gameMode)

	proposalIDs, err = q.queueDistributor.Items(proposalQueue.Name())
	if err != nil {
		return nil, fmt.Errorf("items: %w", err)
	}

	return proposalIDs, nil
}

func (q *matchProposalQueue) Remove(proposalID string, gameMode proto.GameMode) error {
	proposalQueue := newProposalQueue(q.status, gameMode)
	item := newProposalQueueItem(proposalID, proposalQueue)

	if err := q.queueDistributor.Remove(item); err != nil {
		return fmt.Errorf("remove: %w", err)
	}

	return nil
}

func (q *matchProposalQueue) createQueueItems(proposal *matchmaker.MatchProposal) []*proposalQueueItem {
	var items []*proposalQueueItem

	for gameMode, ok := range proposal.GameModes() {
		if !ok {
			continue
		}

		proposalQueue := newProposalQueue(q.status, gameMode)
		item := newProposalQueueItem(proposal.ID(), proposalQueue)

		items = append(items, item)
	}

	return items
}

type proposalQueueItem struct {
	id    string
	queue queue.Queue
}

func newProposalQueueItem(proposalID string, queue queue.Queue) *proposalQueueItem {
	return &proposalQueueItem{
		id:    proposalID,
		queue: queue,
	}
}

func (i *proposalQueueItem) ID() string {
	return i.id
}

func (i *proposalQueueItem) Queue() queue.Queue {
	return i.queue
}

type proposalQueue struct {
	name string
}

func newProposalQueue(status matchmaker.MatchProposalStatus, gameMode proto.GameMode) *proposalQueue {
	return &proposalQueue{
		name: fmt.Sprintf(queueNameFmt, gameMode, status),
	}
}

func (q *proposalQueue) Name() string {
	return q.name
}
