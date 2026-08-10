package custommatchmaker

import (
	"errors"
	"fmt"
	"strings"
	"time"

	"github.com/horizon-games/OpenSky/api/proto"
	"github.com/horizon-games/OpenSky/matchmaker/config"
	"github.com/horizon-games/OpenSky/matchmaker/lib/lock"
	"github.com/horizon-games/OpenSky/matchmaker/lib/matchmaker"
	"github.com/horizon-games/OpenSky/matchmaker/lib/store"
)

const (
	matchProposalStoreIDFmt     = "match_proposal:%s"
	matchProposalLockStoreIDFmt = "match_proposal:%s.lock"
	matchPendingStoreIDFmt      = "match_pending:%s"
	// extraTime makes sure the object is stored a little bit longer than the timeout duration.
	extraTime = time.Hour
)

//go:generate go run go.uber.org/mock/mockgen -destination ./mock/match_proposal_repository.go -package mock . MatchProposalRepository
type MatchProposalRepository interface {
	Save(*matchmaker.MatchProposal) error
	Load(proposalID string) (*matchmaker.MatchProposal, error)
	Delete(*matchmaker.MatchProposal) error
	Locker(proposalID string) lock.Mutex
	HasMatchProposal(proto.Hash) (bool, error)
}

type matchProposalRepository struct {
	keyValStore            store.Store
	locker                 lock.Locker
	matchAcceptanceTimeout time.Duration
	acceptedQueue          AcceptedMatchProposalQueue
}

func NewMatchProposalRepository(cfg *config.Config, keyValStore store.Store, locker lock.Locker, acceptedQueue AcceptedMatchProposalQueue) *matchProposalRepository {
	return &matchProposalRepository{
		keyValStore:            keyValStore,
		locker:                 locker,
		matchAcceptanceTimeout: cfg.MatchMaker.MatchAcceptanceTimeout,
		acceptedQueue:          acceptedQueue,
	}
}

func (r *matchProposalRepository) Save(proposal *matchmaker.MatchProposal) error {
	if proposal == nil {
		return fmt.Errorf("match proposal cannot be nil")
	}

	if proposal.Timeout() == nil {
		proposal.SetTimeout(r.matchAcceptanceTimeout)
	}

	if proposal.IsAccepted() {
		if err := r.pushToQueue(proposal); err != nil {
			return fmt.Errorf("push to queue: %w", err)
		}
	}

	if proposal.IsToBeMade() {
		for gameMode, ok := range proposal.GameModes() {
			if !ok {
				continue
			}

			if err := r.acceptedQueue.Remove(proposal.ID(), gameMode); err != nil {
				return fmt.Errorf("remove from queue: %w", err)
			}
		}
	}

	if err := r.keyValStore.StoreTTL(r.proposalStoreID(proposal.ID()), proposal.Data(), *proposal.Timeout()+extraTime); err != nil {
		return fmt.Errorf("store match proposal: %w", err)
	}

	if proposal.IsFound() {
		for _, address := range proposal.Addresses() {
			if proposal.Timeout() == nil || *proposal.Timeout() <= 0 {
				continue
			}

			has, err := r.HasMatchProposal(address)
			if err != nil {
				return fmt.Errorf("has match proposal: %w", err)
			}

			if has {
				continue
			}

			if err := r.keyValStore.StoreTTL(r.pendingMatchStoreID(address), proposal.ID(), *proposal.Timeout()); err != nil {
				return fmt.Errorf("store player pending match: %w", err)
			}
		}
	}

	return nil
}

func (r *matchProposalRepository) pushToQueue(proposal *matchmaker.MatchProposal) error {
	if !proposal.IsAccepted() {
		return nil
	}

	savedProposal, err := r.Load(proposal.ID())
	if err != nil {
		return fmt.Errorf("load: %w", err)
	}

	if savedProposal == nil || !savedProposal.IsAccepted() {
		if err := r.acceptedQueue.Push(proposal); err != nil {
			return fmt.Errorf("push to queue: %w", err)
		}
	}

	return nil
}

func (r *matchProposalRepository) Load(proposalID string) (*matchmaker.MatchProposal, error) {
	var data matchmaker.MatchProposalData

	ttl, err := r.keyValStore.TTL(r.proposalStoreID(proposalID))
	if err != nil && !errors.Is(err, store.ErrNoSuchItem) {
		return nil, fmt.Errorf("get ttl: %w", err)
	}

	if err := r.keyValStore.Load(r.proposalStoreID(proposalID), &data); err != nil {
		if errors.Is(err, store.ErrNoSuchItem) {
			return nil, nil
		}

		return nil, fmt.Errorf("load: %w", err)
	}

	ttlMinusExtraTime := ttl - extraTime

	proposal := matchmaker.NewMatchProposalWithData(data)
	proposal.SetTimeout(ttlMinusExtraTime)

	return proposal, nil
}

func (r *matchProposalRepository) Delete(proposal *matchmaker.MatchProposal) error {
	if err := r.keyValStore.Delete(r.proposalStoreID(proposal.ID())); err != nil {
		return fmt.Errorf("delete match proposal: %w", err)
	}

	for _, address := range proposal.Addresses() {
		if err := r.keyValStore.Delete(r.pendingMatchStoreID(address)); err != nil {
			return fmt.Errorf("delete player pending match: %w", err)
		}
	}

	if proposal.IsAccepted() {
		for gameMode, ok := range proposal.GameModes() {
			if !ok {
				continue
			}

			if err := r.acceptedQueue.Remove(proposal.ID(), gameMode); err != nil {
				return fmt.Errorf("remove from queue: %w", err)
			}
		}
	}

	return nil
}

func (r *matchProposalRepository) proposalStoreID(proposalID string) string {
	return fmt.Sprintf(matchProposalStoreIDFmt, strings.ToLower(proposalID))
}

func (r *matchProposalRepository) Locker(proposalID string) lock.Mutex {
	return r.locker.New(r.proposalLockStoreID(proposalID))
}

func (r *matchProposalRepository) proposalLockStoreID(proposalID string) string {
	return fmt.Sprintf(matchProposalLockStoreIDFmt, strings.ToLower(proposalID))
}

func (r *matchProposalRepository) HasMatchProposal(address proto.Hash) (bool, error) {
	ttl, err := r.keyValStore.TTL(r.pendingMatchStoreID(address))
	if err != nil && !errors.Is(err, store.ErrNoSuchItem) {
		return false, fmt.Errorf("ttl: %w", err)
	}

	if ttl < 0 || errors.Is(err, store.ErrNoSuchItem) {
		return false, nil
	}

	return true, nil
}

func (r *matchProposalRepository) pendingMatchStoreID(address proto.Hash) string {
	return fmt.Sprintf(matchPendingStoreIDFmt, address)
}
