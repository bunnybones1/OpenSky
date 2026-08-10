package custommatchmaker_test

import (
	"context"
	"fmt"
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"go.uber.org/mock/gomock"

	"github.com/horizon-games/OpenSky/api/proto"
	"github.com/horizon-games/OpenSky/matchmaker/config"
	mmerrors "github.com/horizon-games/OpenSky/matchmaker/lib/errors"
	"github.com/horizon-games/OpenSky/matchmaker/lib/events"
	gamemodecheckermock "github.com/horizon-games/OpenSky/matchmaker/lib/gamemodechecker/mock"
	"github.com/horizon-games/OpenSky/matchmaker/lib/gameservers"
	"github.com/horizon-games/OpenSky/matchmaker/lib/lock"
	"github.com/horizon-games/OpenSky/matchmaker/lib/matchmaker"
	"github.com/horizon-games/OpenSky/matchmaker/lib/matchmaker/custommatchmaker"
	"github.com/horizon-games/OpenSky/matchmaker/lib/matchmaker/custommatchmaker/mock"
	matchmakermock "github.com/horizon-games/OpenSky/matchmaker/lib/matchmaker/mock"
	"github.com/horizon-games/OpenSky/matchmaker/lib/player"
	"github.com/horizon-games/OpenSky/matchmaker/matchmakertest"
	"github.com/horizon-games/OpenSky/matchmaker/matchmakertest/playergen"
)

func TestBackendService(t *testing.T) {
	var matching *matchmakermock.MockMatching

	var notifier *mock.MockNotifier

	var playerQueue *mock.MockPlayerQueue

	var gameModeLocker *mock.MockGameModeLocker

	var gameModeStatusChecker *gamemodecheckermock.MockGameModeStatusChecker

	var playerRepository *mock.MockPlayerRepository

	var matchProposalRepository *mock.MockMatchProposalRepository

	var acceptedMatchProposalQueue *mock.MockAcceptedMatchProposalQueue

	var acceptTimeouter *mock.MockAcceptTimeouter

	// Setup
	{
		// Mocks
		{
			ctrl := gomock.NewController(t)

			matching = matchmakermock.NewMockMatching(ctrl)
			notifier = mock.NewMockNotifier(ctrl)
			playerQueue = mock.NewMockPlayerQueue(ctrl)
			gameModeLocker = mock.NewMockGameModeLocker(ctrl)
			gameModeStatusChecker = gamemodecheckermock.NewMockGameModeStatusChecker(ctrl)
			playerRepository = mock.NewMockPlayerRepository(ctrl)
			matchProposalRepository = mock.NewMockMatchProposalRepository(ctrl)
			acceptedMatchProposalQueue = mock.NewMockAcceptedMatchProposalQueue(ctrl)
			acceptTimeouter = mock.NewMockAcceptTimeouter(ctrl)
		}
	}

	p1 := playergen.MustNew(
		playergen.WithRandomGameMode(),
	)
	p2 := playergen.MustNew(
		playergen.WithRandomGameMode(),
	)
	p3 := playergen.MustNew(
		playergen.WithRandomGameMode(),
	)
	p4 := playergen.MustNew(
		playergen.WithRandomGameMode(),
	)
	b1 := player.NewBotPlayer(proto.GameMode_PRACTICE_BOT)

	matchProposal1 := matchmaker.NewMatchProposal(p1, p2)
	matchProposal2 := matchmaker.NewMatchProposal(p3, b1)

	someError := fmt.Errorf("error")

	acceptanceTimeout := 2 * time.Minute

	cfg := &config.Config{
		MatchMaker: config.MatchMakerConfig{
			MatchAcceptanceTimeout: acceptanceTimeout,
		},
	}

	ctx := context.Background()

	service := custommatchmaker.NewBackendService(
		cfg,
		matchmakertest.NewAssertNoErrorLogger(t),
		matching,
		notifier,
		playerQueue,
		gameModeLocker,
		gameModeStatusChecker,
		playerRepository,
		matchProposalRepository,
		acceptedMatchProposalQueue,
		acceptTimeouter,
	)

	t.Run("find match proposals", func(t *testing.T) {
		enabledMode1 := proto.GameMode_RANKED_CONSTRUCTED
		enabledMode2 := proto.GameMode_CONQUEST_CONSTRUCTED
		disabledMode1 := proto.GameMode_RANKED_DISCOVERY
		disabledMode2 := proto.GameMode_PRACTICE_PVP

		t.Run("found match proposals", func(t *testing.T) {
			matchProposalStatus := matchmaker.MatchProposalStatusFound

			t.Run("calls matching for match proposals and removes players from queue", func(t *testing.T) {
				request := &matchmaker.FindMatchesRequest{
					GameModes:           []proto.GameMode{enabledMode1, enabledMode2},
					MatchProposalStatus: matchProposalStatus,
					EnableBots:          true,
				}

				gameModeLocker.EXPECT().Locker(enabledMode1).Return(lock.NewNoOp())
				gameModeLocker.EXPECT().Locker(enabledMode2).Return(lock.NewNoOp())

				gameModeStatusChecker.EXPECT().IsEnabled(ctx, enabledMode1).Return(true, nil)
				gameModeStatusChecker.EXPECT().IsEnabled(ctx, enabledMode2).Return(true, nil)

				matching.EXPECT().FindMatchProposals(ctx, request).Return([]*matchmaker.MatchProposal{
					matchProposal1,
					matchProposal2,
				}, nil)

				playerRepository.EXPECT().SetStatus(p1, player.PlayerStatus_LOOKING_FOR_MATCH)
				playerRepository.EXPECT().SetStatus(p2, player.PlayerStatus_LOOKING_FOR_MATCH)
				playerRepository.EXPECT().SetStatus(p3, player.PlayerStatus_LOOKING_FOR_MATCH)

				playerQueue.EXPECT().Remove(p1)
				playerQueue.EXPECT().Remove(p2)
				playerQueue.EXPECT().Remove(p3)

				matchProposals, err := service.FindMatchProposals(ctx, request)
				require.NoError(t, err)
				assert.Len(t, matchProposals, 2)
				assert.Contains(t, matchProposals, matchProposal1)
				assert.Contains(t, matchProposals, matchProposal2)
			})

			t.Run("does not fail when removing player from queue fails", func(t *testing.T) {
				request := &matchmaker.FindMatchesRequest{
					GameModes:           []proto.GameMode{enabledMode1},
					MatchProposalStatus: matchProposalStatus,
					EnableBots:          true,
				}

				gameModeLocker.EXPECT().Locker(enabledMode1).Return(lock.NewNoOp())

				gameModeStatusChecker.EXPECT().IsEnabled(ctx, enabledMode1).Return(true, nil)

				matching.EXPECT().FindMatchProposals(ctx, request).Return([]*matchmaker.MatchProposal{
					matchProposal1,
				}, nil)

				playerRepository.EXPECT().SetStatus(p1, player.PlayerStatus_LOOKING_FOR_MATCH)
				playerRepository.EXPECT().SetStatus(p2, player.PlayerStatus_LOOKING_FOR_MATCH)

				playerQueue.EXPECT().Remove(p1).Return(someError)
				playerQueue.EXPECT().Remove(p2)

				service := custommatchmaker.NewBackendService(
					cfg,
					matchmakertest.NewAssertErrorContainsLogger(t, "remove player from queue"),
					matching,
					notifier,
					playerQueue,
					gameModeLocker,
					gameModeStatusChecker,
					playerRepository,
					matchProposalRepository,
					acceptedMatchProposalQueue,
					acceptTimeouter,
				)

				matchProposals, err := service.FindMatchProposals(ctx, request)
				require.NoError(t, err)
				assert.Len(t, matchProposals, 1)
				assert.Contains(t, matchProposals, matchProposal1)
			})

			t.Run("does not fail when setting player status fails", func(t *testing.T) {
				request := &matchmaker.FindMatchesRequest{
					GameModes:           []proto.GameMode{enabledMode1},
					MatchProposalStatus: matchProposalStatus,
					EnableBots:          true,
				}

				gameModeLocker.EXPECT().Locker(enabledMode1).Return(lock.NewNoOp())

				gameModeStatusChecker.EXPECT().IsEnabled(ctx, enabledMode1).Return(true, nil)

				matching.EXPECT().FindMatchProposals(ctx, request).Return([]*matchmaker.MatchProposal{
					matchProposal1,
				}, nil)

				playerRepository.EXPECT().SetStatus(p1, player.PlayerStatus_LOOKING_FOR_MATCH).Return(someError)
				playerRepository.EXPECT().SetStatus(p2, player.PlayerStatus_LOOKING_FOR_MATCH)

				playerQueue.EXPECT().Remove(p1)
				playerQueue.EXPECT().Remove(p2)

				service := custommatchmaker.NewBackendService(
					cfg,
					matchmakertest.NewAssertErrorContainsLogger(t, "set player status to 'LOOKING_FOR_MATCH'"),
					matching,
					notifier,
					playerQueue,
					gameModeLocker,
					gameModeStatusChecker,
					playerRepository,
					matchProposalRepository,
					acceptedMatchProposalQueue,
					acceptTimeouter,
				)

				matchProposals, err := service.FindMatchProposals(ctx, request)
				require.NoError(t, err)
				assert.Len(t, matchProposals, 1)
				assert.Contains(t, matchProposals, matchProposal1)
			})

			t.Run("fails when calling matching fails", func(t *testing.T) {
				request := &matchmaker.FindMatchesRequest{
					GameModes:           []proto.GameMode{enabledMode1},
					MatchProposalStatus: matchProposalStatus,
					EnableBots:          true,
				}

				gameModeLocker.EXPECT().Locker(enabledMode1).Return(lock.NewNoOp())

				gameModeStatusChecker.EXPECT().IsEnabled(ctx, enabledMode1).Return(true, nil)

				matching.EXPECT().FindMatchProposals(ctx, request).Return(nil, someError)

				matchProposals, err := service.FindMatchProposals(ctx, request)
				require.ErrorIs(t, err, someError)
				assert.Empty(t, matchProposals)
			})

			t.Run("fails when checking game mode status fails", func(t *testing.T) {
				request := &matchmaker.FindMatchesRequest{
					GameModes:           []proto.GameMode{enabledMode1},
					MatchProposalStatus: matchProposalStatus,
					EnableBots:          true,
				}

				gameModeLocker.EXPECT().Locker(enabledMode1).Return(lock.NewNoOp())

				gameModeStatusChecker.EXPECT().IsEnabled(ctx, enabledMode1).Return(false, someError)

				matchProposals, err := service.FindMatchProposals(ctx, request)
				require.ErrorIs(t, err, someError)
				assert.Empty(t, matchProposals)
			})

			t.Run("drains player queue when game mode is disabled", func(t *testing.T) {
				disabledMode := proto.GameMode_RANKED_CONSTRUCTED
				enabledMode := proto.GameMode_CONQUEST_CONSTRUCTED

				request := &matchmaker.FindMatchesRequest{
					GameModes: []proto.GameMode{
						disabledMode,
						enabledMode,
					},
					MatchProposalStatus: matchProposalStatus,
					EnableBots:          true,
				}

				gameModeLocker.EXPECT().Locker(disabledMode).Return(lock.NewNoOp())
				gameModeLocker.EXPECT().Locker(enabledMode).Return(lock.NewNoOp())

				gameModeStatusChecker.EXPECT().IsEnabled(ctx, disabledMode).Return(false, nil)
				gameModeStatusChecker.EXPECT().IsEnabled(ctx, enabledMode).Return(true, nil)

				playerQueue.EXPECT().Items(disabledMode).Return([]proto.Hash{p3.Address()}, nil)

				notifier.EXPECT().Message(ctx, mmerrors.ErrGameModeDisabled, player.NewWithAddressAndMode(p3.Address(), disabledMode))

				playerQueue.EXPECT().Remove(player.NewWithAddressAndMode(p3.Address(), disabledMode))

				expectedRequest := &matchmaker.FindMatchesRequest{
					GameModes: []proto.GameMode{
						enabledMode,
					},
					MatchProposalStatus: matchProposalStatus,
					EnableBots:          true,
				}

				matching.EXPECT().FindMatchProposals(ctx, expectedRequest).Return([]*matchmaker.MatchProposal{
					matchProposal1,
				}, nil)

				playerRepository.EXPECT().SetStatus(p1, player.PlayerStatus_LOOKING_FOR_MATCH)
				playerRepository.EXPECT().SetStatus(p2, player.PlayerStatus_LOOKING_FOR_MATCH)

				playerQueue.EXPECT().Remove(p1)
				playerQueue.EXPECT().Remove(p2)

				matchProposals, err := service.FindMatchProposals(ctx, request)
				require.NoError(t, err)
				assert.Len(t, matchProposals, 1)
				assert.Contains(t, matchProposals, matchProposal1)
			})

			t.Run("does not fail when removing player from queue during draining fails", func(t *testing.T) {
				disabledMode := proto.GameMode_RANKED_CONSTRUCTED
				enabledMode := proto.GameMode_CONQUEST_CONSTRUCTED

				request := &matchmaker.FindMatchesRequest{
					GameModes: []proto.GameMode{
						disabledMode,
						enabledMode,
					},
					MatchProposalStatus: matchProposalStatus,
					EnableBots:          true,
				}

				gameModeLocker.EXPECT().Locker(disabledMode).Return(lock.NewNoOp())
				gameModeLocker.EXPECT().Locker(enabledMode).Return(lock.NewNoOp())

				gameModeStatusChecker.EXPECT().IsEnabled(ctx, disabledMode).Return(false, nil)
				gameModeStatusChecker.EXPECT().IsEnabled(ctx, enabledMode).Return(true, nil)

				playerQueue.EXPECT().Items(disabledMode).Return([]proto.Hash{p3.Address(), p4.Address()}, nil)

				notifier.EXPECT().Message(ctx, mmerrors.ErrGameModeDisabled, player.NewWithAddressAndMode(p3.Address(), disabledMode))
				notifier.EXPECT().Message(ctx, mmerrors.ErrGameModeDisabled, player.NewWithAddressAndMode(p4.Address(), disabledMode))

				playerQueue.EXPECT().Remove(player.NewWithAddressAndMode(p3.Address(), disabledMode)).Return(someError)
				playerQueue.EXPECT().Remove(player.NewWithAddressAndMode(p4.Address(), disabledMode))

				expectedRequest := &matchmaker.FindMatchesRequest{
					GameModes: []proto.GameMode{
						enabledMode,
					},
					MatchProposalStatus: matchProposalStatus,
					EnableBots:          true,
				}

				matching.EXPECT().FindMatchProposals(ctx, expectedRequest).Return([]*matchmaker.MatchProposal{
					matchProposal1,
				}, nil)

				playerRepository.EXPECT().SetStatus(p1, player.PlayerStatus_LOOKING_FOR_MATCH)
				playerRepository.EXPECT().SetStatus(p2, player.PlayerStatus_LOOKING_FOR_MATCH)

				playerQueue.EXPECT().Remove(p1)
				playerQueue.EXPECT().Remove(p2)

				service := custommatchmaker.NewBackendService(
					cfg,
					matchmakertest.NewAssertErrorContainsLogger(t, "remove player from queue"),
					matching,
					notifier,
					playerQueue,
					gameModeLocker,
					gameModeStatusChecker,
					playerRepository,
					matchProposalRepository,
					acceptedMatchProposalQueue,
					acceptTimeouter,
				)

				matchProposals, err := service.FindMatchProposals(ctx, request)
				require.NoError(t, err)
				assert.Len(t, matchProposals, 1)
				assert.Contains(t, matchProposals, matchProposal1)
			})

			t.Run("does not fail when notifying player during draining fails", func(t *testing.T) {
				disabledMode := proto.GameMode_RANKED_CONSTRUCTED
				enabledMode := proto.GameMode_CONQUEST_CONSTRUCTED

				request := &matchmaker.FindMatchesRequest{
					GameModes: []proto.GameMode{
						disabledMode,
						enabledMode,
					},
					MatchProposalStatus: matchProposalStatus,
					EnableBots:          true,
				}

				gameModeLocker.EXPECT().Locker(disabledMode).Return(lock.NewNoOp())
				gameModeLocker.EXPECT().Locker(enabledMode).Return(lock.NewNoOp())

				gameModeStatusChecker.EXPECT().IsEnabled(ctx, disabledMode).Return(false, nil)
				gameModeStatusChecker.EXPECT().IsEnabled(ctx, enabledMode).Return(true, nil)

				playerQueue.EXPECT().Items(disabledMode).Return([]proto.Hash{p3.Address(), p4.Address()}, nil)

				notifier.EXPECT().Message(ctx, mmerrors.ErrGameModeDisabled, player.NewWithAddressAndMode(p3.Address(), disabledMode)).Return(someError)
				notifier.EXPECT().Message(ctx, mmerrors.ErrGameModeDisabled, player.NewWithAddressAndMode(p4.Address(), disabledMode))

				playerQueue.EXPECT().Remove(player.NewWithAddressAndMode(p3.Address(), disabledMode))
				playerQueue.EXPECT().Remove(player.NewWithAddressAndMode(p4.Address(), disabledMode))

				expectedRequest := &matchmaker.FindMatchesRequest{
					GameModes: []proto.GameMode{
						enabledMode,
					},
					MatchProposalStatus: matchProposalStatus,
					EnableBots:          true,
				}

				matching.EXPECT().FindMatchProposals(ctx, expectedRequest).Return([]*matchmaker.MatchProposal{
					matchProposal1,
				}, nil)

				playerRepository.EXPECT().SetStatus(p1, player.PlayerStatus_LOOKING_FOR_MATCH)
				playerRepository.EXPECT().SetStatus(p2, player.PlayerStatus_LOOKING_FOR_MATCH)

				playerQueue.EXPECT().Remove(p1)
				playerQueue.EXPECT().Remove(p2)

				service := custommatchmaker.NewBackendService(
					cfg,
					matchmakertest.NewAssertErrorContainsLogger(t, "send error game mode disabled message"),
					matching,
					notifier,
					playerQueue,
					gameModeLocker,
					gameModeStatusChecker,
					playerRepository,
					matchProposalRepository,
					acceptedMatchProposalQueue,
					acceptTimeouter,
				)

				matchProposals, err := service.FindMatchProposals(ctx, request)
				require.NoError(t, err)
				assert.Len(t, matchProposals, 1)
				assert.Contains(t, matchProposals, matchProposal1)
			})

			t.Run("does not fail when fetching players from queue during draining fails", func(t *testing.T) {
				disabledMode := proto.GameMode_RANKED_CONSTRUCTED
				enabledMode := proto.GameMode_CONQUEST_CONSTRUCTED

				request := &matchmaker.FindMatchesRequest{
					GameModes: []proto.GameMode{
						disabledMode,
						enabledMode,
					},
					MatchProposalStatus: matchProposalStatus,
					EnableBots:          true,
				}

				gameModeLocker.EXPECT().Locker(disabledMode).Return(lock.NewNoOp())
				gameModeLocker.EXPECT().Locker(enabledMode).Return(lock.NewNoOp())

				gameModeStatusChecker.EXPECT().IsEnabled(ctx, disabledMode).Return(false, nil)
				gameModeStatusChecker.EXPECT().IsEnabled(ctx, enabledMode).Return(true, nil)

				playerQueue.EXPECT().Items(disabledMode).Return(nil, someError)

				expectedRequest := &matchmaker.FindMatchesRequest{
					GameModes: []proto.GameMode{
						enabledMode,
					},
					MatchProposalStatus: matchProposalStatus,
					EnableBots:          true,
				}

				matching.EXPECT().FindMatchProposals(ctx, expectedRequest).Return([]*matchmaker.MatchProposal{
					matchProposal1,
				}, nil)

				playerRepository.EXPECT().SetStatus(p1, player.PlayerStatus_LOOKING_FOR_MATCH)
				playerRepository.EXPECT().SetStatus(p2, player.PlayerStatus_LOOKING_FOR_MATCH)

				playerQueue.EXPECT().Remove(p1)
				playerQueue.EXPECT().Remove(p2)

				service := custommatchmaker.NewBackendService(
					cfg,
					matchmakertest.NewAssertErrorContainsLogger(t, "drain the queue"),
					matching,
					notifier,
					playerQueue,
					gameModeLocker,
					gameModeStatusChecker,
					playerRepository,
					matchProposalRepository,
					acceptedMatchProposalQueue,
					acceptTimeouter,
				)

				matchProposals, err := service.FindMatchProposals(ctx, request)
				require.NoError(t, err)
				assert.Len(t, matchProposals, 1)
				assert.Contains(t, matchProposals, matchProposal1)
			})

			t.Run("does not fail when all game modes are disabled", func(t *testing.T) {
				request := &matchmaker.FindMatchesRequest{
					GameModes: []proto.GameMode{
						disabledMode1,
						disabledMode2,
					},
					MatchProposalStatus: matchProposalStatus,
					EnableBots:          true,
				}

				gameModeLocker.EXPECT().Locker(disabledMode1).Return(lock.NewNoOp())
				gameModeLocker.EXPECT().Locker(disabledMode2).Return(lock.NewNoOp())

				gameModeStatusChecker.EXPECT().IsEnabled(ctx, disabledMode1).Return(false, nil)
				gameModeStatusChecker.EXPECT().IsEnabled(ctx, disabledMode2).Return(false, nil)

				playerQueue.EXPECT().Items(disabledMode1).Return(nil, nil)
				playerQueue.EXPECT().Items(disabledMode2).Return(nil, nil)

				matchProposals, err := service.FindMatchProposals(ctx, request)
				require.NoError(t, err)
				assert.Empty(t, matchProposals)
			})
		})

		t.Run("accepted match proposals", func(t *testing.T) {
			matchProposalStatus := matchmaker.MatchProposalStatusAccepted

			t.Run("fetches accepted match proposals and sets them as to be made", func(t *testing.T) {
				matchProposal1 := matchmaker.NewMatchProposal(p1)
				matchProposal2 := matchmaker.NewMatchProposal(p2)

				request := &matchmaker.FindMatchesRequest{
					GameModes: []proto.GameMode{
						enabledMode1,
						enabledMode2,
					},
					MatchProposalStatus: matchProposalStatus,
				}

				gameModeLocker.EXPECT().Locker(enabledMode1).Return(lock.NewNoOp())
				gameModeLocker.EXPECT().Locker(enabledMode2).Return(lock.NewNoOp())

				gameModeStatusChecker.EXPECT().IsEnabled(ctx, enabledMode1).Return(true, nil)
				gameModeStatusChecker.EXPECT().IsEnabled(ctx, enabledMode2).Return(true, nil)

				acceptedMatchProposalQueue.EXPECT().Items(enabledMode1).Return([]string{matchProposal1.ID()}, nil)
				acceptedMatchProposalQueue.EXPECT().Items(enabledMode2).Return([]string{matchProposal2.ID()}, nil)

				matchProposalRepository.EXPECT().Locker(matchProposal1.ID()).Return(lock.NewNoOp())
				matchProposalRepository.EXPECT().Locker(matchProposal2.ID()).Return(lock.NewNoOp())

				matchProposalRepository.EXPECT().Load(matchProposal1.ID()).Return(matchProposal1, nil)
				matchProposalRepository.EXPECT().Load(matchProposal2.ID()).Return(matchProposal2, nil)

				playerRepository.EXPECT().Load(p1.Address()).Return(p1, nil)
				playerRepository.EXPECT().Load(p2.Address()).Return(p2, nil)

				matchProposalRepository.EXPECT().Save(matchProposal1)
				matchProposalRepository.EXPECT().Save(matchProposal2)

				matchProposals, err := service.FindMatchProposals(ctx, request)
				require.NoError(t, err)
				assert.Len(t, matchProposals, 2)
				assert.Contains(t, matchProposals, matchProposal1)
				assert.Contains(t, matchProposals, matchProposal2)

				assert.True(t, matchProposal1.IsToBeMade())
				assert.True(t, matchProposal2.IsToBeMade())
			})

			t.Run("does not fail and drains match proposal when saving match proposal fails", func(t *testing.T) {
				matchProposal1 := matchmaker.NewMatchProposal(p1)
				matchProposal2 := matchmaker.NewMatchProposal(p2)

				request := &matchmaker.FindMatchesRequest{
					GameModes: []proto.GameMode{
						enabledMode1,
					},
					MatchProposalStatus: matchProposalStatus,
				}

				gameModeLocker.EXPECT().Locker(enabledMode1).Return(lock.NewNoOp())

				gameModeStatusChecker.EXPECT().IsEnabled(ctx, enabledMode1).Return(true, nil)

				acceptedMatchProposalQueue.EXPECT().Items(enabledMode1).Return([]string{matchProposal1.ID(), matchProposal2.ID()}, nil)

				matchProposalRepository.EXPECT().Locker(matchProposal1.ID()).Return(lock.NewNoOp())
				matchProposalRepository.EXPECT().Locker(matchProposal2.ID()).Return(lock.NewNoOp())

				matchProposalRepository.EXPECT().Load(matchProposal1.ID()).Return(matchProposal1, nil)
				matchProposalRepository.EXPECT().Load(matchProposal2.ID()).Return(matchProposal2, nil)

				playerRepository.EXPECT().Load(p1.Address()).Return(p1, nil)
				playerRepository.EXPECT().Load(p2.Address()).Return(p2, nil)

				matchProposalRepository.EXPECT().Save(matchProposal1).Return(someError)
				matchProposalRepository.EXPECT().Save(matchProposal2)

				notifier.EXPECT().Message(ctx, mmerrors.ErrServerError, player.NewWithAddress(p1.Address()))

				matchProposalRepository.EXPECT().Delete(matchProposal1)

				service := custommatchmaker.NewBackendService(
					cfg,
					matchmakertest.NewAssertErrorContainsLogger(t, "save accepted match proposal"),
					matching,
					notifier,
					playerQueue,
					gameModeLocker,
					gameModeStatusChecker,
					playerRepository,
					matchProposalRepository,
					acceptedMatchProposalQueue,
					acceptTimeouter,
				)

				matchProposals, err := service.FindMatchProposals(ctx, request)
				require.NoError(t, err)
				assert.Len(t, matchProposals, 1)
				assert.Contains(t, matchProposals, matchProposal2)

				assert.True(t, matchProposal2.IsToBeMade())
			})

			t.Run("does not fail when deleting match proposal during draining match proposal for saving match proposal failure fails", func(t *testing.T) {
				matchProposal1 := matchmaker.NewMatchProposal(p1)
				matchProposal2 := matchmaker.NewMatchProposal(p2)

				request := &matchmaker.FindMatchesRequest{
					GameModes: []proto.GameMode{
						enabledMode1,
					},
					MatchProposalStatus: matchProposalStatus,
				}

				gameModeLocker.EXPECT().Locker(enabledMode1).Return(lock.NewNoOp())

				gameModeStatusChecker.EXPECT().IsEnabled(ctx, enabledMode1).Return(true, nil)

				acceptedMatchProposalQueue.EXPECT().Items(enabledMode1).Return([]string{matchProposal1.ID(), matchProposal2.ID()}, nil)

				matchProposalRepository.EXPECT().Locker(matchProposal1.ID()).Return(lock.NewNoOp())
				matchProposalRepository.EXPECT().Locker(matchProposal2.ID()).Return(lock.NewNoOp())

				matchProposalRepository.EXPECT().Load(matchProposal1.ID()).Return(matchProposal1, nil)
				matchProposalRepository.EXPECT().Load(matchProposal2.ID()).Return(matchProposal2, nil)

				playerRepository.EXPECT().Load(p1.Address()).Return(p1, nil)
				playerRepository.EXPECT().Load(p2.Address()).Return(p2, nil)

				matchProposalRepository.EXPECT().Save(matchProposal1).Return(someError)
				matchProposalRepository.EXPECT().Save(matchProposal2)

				notifier.EXPECT().Message(ctx, mmerrors.ErrServerError, player.NewWithAddress(p1.Address()))

				matchProposalRepository.EXPECT().Delete(matchProposal1).Return(someError)

				service := custommatchmaker.NewBackendService(
					cfg,
					matchmakertest.NewAssertErrorContainsLogger(t,
						"save accepted match proposal",
						"delete accepted match proposal",
					),
					matching,
					notifier,
					playerQueue,
					gameModeLocker,
					gameModeStatusChecker,
					playerRepository,
					matchProposalRepository,
					acceptedMatchProposalQueue,
					acceptTimeouter,
				)

				matchProposals, err := service.FindMatchProposals(ctx, request)
				require.NoError(t, err)
				assert.Len(t, matchProposals, 1)
				assert.Contains(t, matchProposals, matchProposal2)

				assert.True(t, matchProposal2.IsToBeMade())
			})

			t.Run("does not fail when notifying player during draining match proposal for saving match proposal failure fails", func(t *testing.T) {
				matchProposal1 := matchmaker.NewMatchProposal(p1)
				matchProposal2 := matchmaker.NewMatchProposal(p2)

				request := &matchmaker.FindMatchesRequest{
					GameModes: []proto.GameMode{
						enabledMode1,
					},
					MatchProposalStatus: matchProposalStatus,
				}

				gameModeLocker.EXPECT().Locker(enabledMode1).Return(lock.NewNoOp())

				gameModeStatusChecker.EXPECT().IsEnabled(ctx, enabledMode1).Return(true, nil)

				acceptedMatchProposalQueue.EXPECT().Items(enabledMode1).Return([]string{matchProposal1.ID(), matchProposal2.ID()}, nil)

				matchProposalRepository.EXPECT().Locker(matchProposal1.ID()).Return(lock.NewNoOp())
				matchProposalRepository.EXPECT().Locker(matchProposal2.ID()).Return(lock.NewNoOp())

				matchProposalRepository.EXPECT().Load(matchProposal1.ID()).Return(matchProposal1, nil)
				matchProposalRepository.EXPECT().Load(matchProposal2.ID()).Return(matchProposal2, nil)

				playerRepository.EXPECT().Load(p1.Address()).Return(p1, nil)
				playerRepository.EXPECT().Load(p2.Address()).Return(p2, nil)

				matchProposalRepository.EXPECT().Save(matchProposal1).Return(someError)
				matchProposalRepository.EXPECT().Save(matchProposal2)

				notifier.EXPECT().Message(ctx, mmerrors.ErrServerError, player.NewWithAddress(p1.Address())).Return(someError)

				matchProposalRepository.EXPECT().Delete(matchProposal1)

				service := custommatchmaker.NewBackendService(
					cfg,
					matchmakertest.NewAssertErrorContainsLogger(t,
						"save accepted match proposal",
						"send error message",
					),
					matching,
					notifier,
					playerQueue,
					gameModeLocker,
					gameModeStatusChecker,
					playerRepository,
					matchProposalRepository,
					acceptedMatchProposalQueue,
					acceptTimeouter,
				)

				matchProposals, err := service.FindMatchProposals(ctx, request)
				require.NoError(t, err)
				assert.Len(t, matchProposals, 1)
				assert.Contains(t, matchProposals, matchProposal2)

				assert.True(t, matchProposal2.IsToBeMade())
			})

			t.Run("does not fail and drains match proposal when player could not be loaded", func(t *testing.T) {
				matchProposal1 := matchmaker.NewMatchProposal(p1)
				matchProposal2 := matchmaker.NewMatchProposal(p2)

				request := &matchmaker.FindMatchesRequest{
					GameModes: []proto.GameMode{
						enabledMode1,
					},
					MatchProposalStatus: matchProposalStatus,
				}

				gameModeLocker.EXPECT().Locker(enabledMode1).Return(lock.NewNoOp())

				gameModeStatusChecker.EXPECT().IsEnabled(ctx, enabledMode1).Return(true, nil)

				acceptedMatchProposalQueue.EXPECT().Items(enabledMode1).Return([]string{matchProposal1.ID(), matchProposal2.ID()}, nil)

				matchProposalRepository.EXPECT().Locker(matchProposal1.ID()).Return(lock.NewNoOp())
				matchProposalRepository.EXPECT().Locker(matchProposal2.ID()).Return(lock.NewNoOp())

				matchProposalRepository.EXPECT().Load(matchProposal1.ID()).Return(matchProposal1, nil)
				matchProposalRepository.EXPECT().Load(matchProposal2.ID()).Return(matchProposal2, nil)

				playerRepository.EXPECT().Load(p1.Address()).Return(nil, someError)
				playerRepository.EXPECT().Load(p2.Address()).Return(p2, nil)

				matchProposalRepository.EXPECT().Save(matchProposal2)

				notifier.EXPECT().Message(ctx, mmerrors.ErrServerError, player.NewWithAddress(p1.Address()))

				matchProposalRepository.EXPECT().Delete(matchProposal1)

				service := custommatchmaker.NewBackendService(
					cfg,
					matchmakertest.NewAssertErrorContainsLogger(t, "load player in accepted match proposal"),
					matching,
					notifier,
					playerQueue,
					gameModeLocker,
					gameModeStatusChecker,
					playerRepository,
					matchProposalRepository,
					acceptedMatchProposalQueue,
					acceptTimeouter,
				)

				matchProposals, err := service.FindMatchProposals(ctx, request)
				require.NoError(t, err)
				assert.Len(t, matchProposals, 1)
				assert.Contains(t, matchProposals, matchProposal2)

				assert.True(t, matchProposal2.IsToBeMade())
			})

			t.Run("does not fail when deleting match proposal during draining match proposal for player loading failure fails", func(t *testing.T) {
				matchProposal1 := matchmaker.NewMatchProposal(p1)
				matchProposal2 := matchmaker.NewMatchProposal(p2)

				request := &matchmaker.FindMatchesRequest{
					GameModes: []proto.GameMode{
						enabledMode1,
					},
					MatchProposalStatus: matchProposalStatus,
				}

				gameModeLocker.EXPECT().Locker(enabledMode1).Return(lock.NewNoOp())

				gameModeStatusChecker.EXPECT().IsEnabled(ctx, enabledMode1).Return(true, nil)

				acceptedMatchProposalQueue.EXPECT().Items(enabledMode1).Return([]string{matchProposal1.ID(), matchProposal2.ID()}, nil)

				matchProposalRepository.EXPECT().Locker(matchProposal1.ID()).Return(lock.NewNoOp())
				matchProposalRepository.EXPECT().Locker(matchProposal2.ID()).Return(lock.NewNoOp())

				matchProposalRepository.EXPECT().Load(matchProposal1.ID()).Return(matchProposal1, nil)
				matchProposalRepository.EXPECT().Load(matchProposal2.ID()).Return(matchProposal2, nil)

				playerRepository.EXPECT().Load(p1.Address()).Return(nil, someError)
				playerRepository.EXPECT().Load(p2.Address()).Return(p2, nil)

				matchProposalRepository.EXPECT().Save(matchProposal2)

				notifier.EXPECT().Message(ctx, mmerrors.ErrServerError, player.NewWithAddress(p1.Address()))

				matchProposalRepository.EXPECT().Delete(matchProposal1).Return(someError)

				service := custommatchmaker.NewBackendService(
					cfg,
					matchmakertest.NewAssertErrorContainsLogger(t,
						"load player in accepted match proposal",
						"delete accepted match proposal",
					),
					matching,
					notifier,
					playerQueue,
					gameModeLocker,
					gameModeStatusChecker,
					playerRepository,
					matchProposalRepository,
					acceptedMatchProposalQueue,
					acceptTimeouter,
				)

				matchProposals, err := service.FindMatchProposals(ctx, request)
				require.NoError(t, err)
				assert.Len(t, matchProposals, 1)
				assert.Contains(t, matchProposals, matchProposal2)

				assert.True(t, matchProposal2.IsToBeMade())
			})

			t.Run("does not fail when notifying player during draining match proposal for player loading failure fails", func(t *testing.T) {
				matchProposal1 := matchmaker.NewMatchProposal(p1)
				matchProposal2 := matchmaker.NewMatchProposal(p2)

				request := &matchmaker.FindMatchesRequest{
					GameModes: []proto.GameMode{
						enabledMode1,
					},
					MatchProposalStatus: matchProposalStatus,
				}

				gameModeLocker.EXPECT().Locker(enabledMode1).Return(lock.NewNoOp())

				gameModeStatusChecker.EXPECT().IsEnabled(ctx, enabledMode1).Return(true, nil)

				acceptedMatchProposalQueue.EXPECT().Items(enabledMode1).Return([]string{matchProposal1.ID(), matchProposal2.ID()}, nil)

				matchProposalRepository.EXPECT().Locker(matchProposal1.ID()).Return(lock.NewNoOp())
				matchProposalRepository.EXPECT().Locker(matchProposal2.ID()).Return(lock.NewNoOp())

				matchProposalRepository.EXPECT().Load(matchProposal1.ID()).Return(matchProposal1, nil)
				matchProposalRepository.EXPECT().Load(matchProposal2.ID()).Return(matchProposal2, nil)

				playerRepository.EXPECT().Load(p1.Address()).Return(nil, someError)
				playerRepository.EXPECT().Load(p2.Address()).Return(p2, nil)

				matchProposalRepository.EXPECT().Save(matchProposal2)

				notifier.EXPECT().Message(ctx, mmerrors.ErrServerError, player.NewWithAddress(p1.Address())).Return(someError)

				matchProposalRepository.EXPECT().Delete(matchProposal1)

				service := custommatchmaker.NewBackendService(
					cfg,
					matchmakertest.NewAssertErrorContainsLogger(t,
						"load player in accepted match proposal",
						"send error message",
					),
					matching,
					notifier,
					playerQueue,
					gameModeLocker,
					gameModeStatusChecker,
					playerRepository,
					matchProposalRepository,
					acceptedMatchProposalQueue,
					acceptTimeouter,
				)

				matchProposals, err := service.FindMatchProposals(ctx, request)
				require.NoError(t, err)
				assert.Len(t, matchProposals, 1)
				assert.Contains(t, matchProposals, matchProposal2)

				assert.True(t, matchProposal2.IsToBeMade())
			})

			t.Run("does not fail when loading accepted match proposal fails", func(t *testing.T) {
				matchProposal1 := matchmaker.NewMatchProposal(p1)
				matchProposal2 := matchmaker.NewMatchProposal(p2)

				request := &matchmaker.FindMatchesRequest{
					GameModes: []proto.GameMode{
						enabledMode1,
					},
					MatchProposalStatus: matchProposalStatus,
				}

				gameModeLocker.EXPECT().Locker(enabledMode1).Return(lock.NewNoOp())

				gameModeStatusChecker.EXPECT().IsEnabled(ctx, enabledMode1).Return(true, nil)

				acceptedMatchProposalQueue.EXPECT().Items(enabledMode1).Return([]string{matchProposal1.ID(), matchProposal2.ID()}, nil)

				matchProposalRepository.EXPECT().Locker(matchProposal1.ID()).Return(lock.NewNoOp())
				matchProposalRepository.EXPECT().Locker(matchProposal2.ID()).Return(lock.NewNoOp())

				matchProposalRepository.EXPECT().Load(matchProposal1.ID()).Return(nil, someError)
				matchProposalRepository.EXPECT().Load(matchProposal2.ID()).Return(matchProposal1, nil)

				playerRepository.EXPECT().Load(p1.Address()).Return(p1, nil)

				matchProposalRepository.EXPECT().Save(matchProposal1)

				service := custommatchmaker.NewBackendService(
					cfg,
					matchmakertest.NewAssertErrorContainsLogger(t, "load accepted match proposal"),
					matching,
					notifier,
					playerQueue,
					gameModeLocker,
					gameModeStatusChecker,
					playerRepository,
					matchProposalRepository,
					acceptedMatchProposalQueue,
					acceptTimeouter,
				)

				matchProposals, err := service.FindMatchProposals(ctx, request)
				require.NoError(t, err)
				assert.Len(t, matchProposals, 1)
				assert.Contains(t, matchProposals, matchProposal1)

				assert.True(t, matchProposal1.IsToBeMade())
			})

			t.Run("does not fail when listing accepted match proposals fails", func(t *testing.T) {
				matchProposal1 := matchmaker.NewMatchProposal(p1)

				request := &matchmaker.FindMatchesRequest{
					GameModes: []proto.GameMode{
						enabledMode1,
						enabledMode2,
					},
					MatchProposalStatus: matchProposalStatus,
				}

				gameModeLocker.EXPECT().Locker(enabledMode1).Return(lock.NewNoOp())
				gameModeLocker.EXPECT().Locker(enabledMode2).Return(lock.NewNoOp())

				gameModeStatusChecker.EXPECT().IsEnabled(ctx, enabledMode1).Return(true, nil)
				gameModeStatusChecker.EXPECT().IsEnabled(ctx, enabledMode2).Return(true, nil)

				acceptedMatchProposalQueue.EXPECT().Items(enabledMode1).Return([]string{}, someError)
				acceptedMatchProposalQueue.EXPECT().Items(enabledMode2).Return([]string{matchProposal1.ID()}, nil)

				matchProposalRepository.EXPECT().Locker(matchProposal1.ID()).Return(lock.NewNoOp())

				matchProposalRepository.EXPECT().Load(matchProposal1.ID()).Return(matchProposal1, nil)

				playerRepository.EXPECT().Load(p1.Address()).Return(p1, nil)

				matchProposalRepository.EXPECT().Save(matchProposal1)

				service := custommatchmaker.NewBackendService(
					cfg,
					matchmakertest.NewAssertErrorContainsLogger(t, "list accepted match proposals"),
					matching,
					notifier,
					playerQueue,
					gameModeLocker,
					gameModeStatusChecker,
					playerRepository,
					matchProposalRepository,
					acceptedMatchProposalQueue,
					acceptTimeouter,
				)

				matchProposals, err := service.FindMatchProposals(ctx, request)
				require.NoError(t, err)
				assert.Len(t, matchProposals, 1)
				assert.Contains(t, matchProposals, matchProposal1)

				assert.True(t, matchProposal1.IsToBeMade())
			})

			t.Run("drains match proposals for disabled game mode", func(t *testing.T) {
				matchProposal1 := matchmaker.NewMatchProposal(p1)
				matchProposal2 := matchmaker.NewMatchProposal(p2)

				request := &matchmaker.FindMatchesRequest{
					GameModes: []proto.GameMode{
						disabledMode1,
						enabledMode1,
					},
					MatchProposalStatus: matchProposalStatus,
				}

				gameModeLocker.EXPECT().Locker(disabledMode1).Return(lock.NewNoOp())
				gameModeLocker.EXPECT().Locker(enabledMode1).Return(lock.NewNoOp())

				gameModeStatusChecker.EXPECT().IsEnabled(ctx, disabledMode1).Return(false, nil)
				gameModeStatusChecker.EXPECT().IsEnabled(ctx, enabledMode1).Return(true, nil)

				acceptedMatchProposalQueue.EXPECT().Items(disabledMode1).Return([]string{matchProposal1.ID()}, nil)
				acceptedMatchProposalQueue.EXPECT().Items(enabledMode1).Return([]string{matchProposal2.ID()}, nil)

				matchProposalRepository.EXPECT().Locker(matchProposal1.ID()).Return(lock.NewNoOp())
				matchProposalRepository.EXPECT().Locker(matchProposal2.ID()).Return(lock.NewNoOp())

				matchProposalRepository.EXPECT().Load(matchProposal1.ID()).Return(matchProposal1, nil)
				matchProposalRepository.EXPECT().Load(matchProposal2.ID()).Return(matchProposal2, nil)

				notifier.EXPECT().Message(ctx, mmerrors.ErrServerShutdown, player.NewWithAddress(p1.Address()))

				matchProposalRepository.EXPECT().Delete(matchProposal1)

				playerRepository.EXPECT().Load(p2.Address()).Return(p2, nil)

				matchProposalRepository.EXPECT().Save(matchProposal2)

				matchProposals, err := service.FindMatchProposals(ctx, request)
				require.NoError(t, err)
				assert.Len(t, matchProposals, 1)
				assert.Contains(t, matchProposals, matchProposal2)

				assert.True(t, matchProposal2.IsToBeMade())
			})

			t.Run("does not fail when deleting match proposal during draining match proposals for disabled game mode fails", func(t *testing.T) {
				matchProposal1 := matchmaker.NewMatchProposal(p1)
				matchProposal2 := matchmaker.NewMatchProposal(p2)

				request := &matchmaker.FindMatchesRequest{
					GameModes: []proto.GameMode{
						disabledMode1,
						enabledMode1,
					},
					MatchProposalStatus: matchProposalStatus,
				}

				gameModeLocker.EXPECT().Locker(disabledMode1).Return(lock.NewNoOp())
				gameModeLocker.EXPECT().Locker(enabledMode1).Return(lock.NewNoOp())

				gameModeStatusChecker.EXPECT().IsEnabled(ctx, disabledMode1).Return(false, nil)
				gameModeStatusChecker.EXPECT().IsEnabled(ctx, enabledMode1).Return(true, nil)

				acceptedMatchProposalQueue.EXPECT().Items(disabledMode1).Return([]string{matchProposal1.ID()}, nil)
				acceptedMatchProposalQueue.EXPECT().Items(enabledMode1).Return([]string{matchProposal2.ID()}, nil)

				matchProposalRepository.EXPECT().Locker(matchProposal1.ID()).Return(lock.NewNoOp())
				matchProposalRepository.EXPECT().Locker(matchProposal2.ID()).Return(lock.NewNoOp())

				matchProposalRepository.EXPECT().Load(matchProposal1.ID()).Return(matchProposal1, nil)
				matchProposalRepository.EXPECT().Load(matchProposal2.ID()).Return(matchProposal2, nil)

				notifier.EXPECT().Message(ctx, mmerrors.ErrServerShutdown, player.NewWithAddress(p1.Address()))

				matchProposalRepository.EXPECT().Delete(matchProposal1).Return(someError)

				playerRepository.EXPECT().Load(p2.Address()).Return(p2, nil)

				matchProposalRepository.EXPECT().Save(matchProposal2)

				service := custommatchmaker.NewBackendService(
					cfg,
					matchmakertest.NewAssertErrorContainsLogger(t, "delete accepted match proposal"),
					matching,
					notifier,
					playerQueue,
					gameModeLocker,
					gameModeStatusChecker,
					playerRepository,
					matchProposalRepository,
					acceptedMatchProposalQueue,
					acceptTimeouter,
				)

				matchProposals, err := service.FindMatchProposals(ctx, request)
				require.NoError(t, err)
				assert.Len(t, matchProposals, 1)
				assert.Contains(t, matchProposals, matchProposal2)

				assert.True(t, matchProposal2.IsToBeMade())
			})

			t.Run("does not fail when notifying player during draining match proposals for disabled game mode fails", func(t *testing.T) {
				matchProposal1 := matchmaker.NewMatchProposal(p1, p3)
				matchProposal2 := matchmaker.NewMatchProposal(p2)

				request := &matchmaker.FindMatchesRequest{
					GameModes: []proto.GameMode{
						disabledMode1,
						enabledMode1,
					},
					MatchProposalStatus: matchProposalStatus,
				}

				gameModeLocker.EXPECT().Locker(disabledMode1).Return(lock.NewNoOp())
				gameModeLocker.EXPECT().Locker(enabledMode1).Return(lock.NewNoOp())

				gameModeStatusChecker.EXPECT().IsEnabled(ctx, disabledMode1).Return(false, nil)
				gameModeStatusChecker.EXPECT().IsEnabled(ctx, enabledMode1).Return(true, nil)

				acceptedMatchProposalQueue.EXPECT().Items(disabledMode1).Return([]string{matchProposal1.ID()}, nil)
				acceptedMatchProposalQueue.EXPECT().Items(enabledMode1).Return([]string{matchProposal2.ID()}, nil)

				matchProposalRepository.EXPECT().Locker(matchProposal1.ID()).Return(lock.NewNoOp())
				matchProposalRepository.EXPECT().Locker(matchProposal2.ID()).Return(lock.NewNoOp())

				matchProposalRepository.EXPECT().Load(matchProposal1.ID()).Return(matchProposal1, nil)
				matchProposalRepository.EXPECT().Load(matchProposal2.ID()).Return(matchProposal2, nil)

				notifier.EXPECT().Message(ctx, mmerrors.ErrServerShutdown, player.NewWithAddress(p1.Address())).Return(someError)
				notifier.EXPECT().Message(ctx, mmerrors.ErrServerShutdown, player.NewWithAddress(p3.Address()))

				matchProposalRepository.EXPECT().Delete(matchProposal1)

				playerRepository.EXPECT().Load(p2.Address()).Return(p2, nil)

				matchProposalRepository.EXPECT().Save(matchProposal2)

				service := custommatchmaker.NewBackendService(
					cfg,
					matchmakertest.NewAssertErrorContainsLogger(t, "send error message"),
					matching,
					notifier,
					playerQueue,
					gameModeLocker,
					gameModeStatusChecker,
					playerRepository,
					matchProposalRepository,
					acceptedMatchProposalQueue,
					acceptTimeouter,
				)

				matchProposals, err := service.FindMatchProposals(ctx, request)
				require.NoError(t, err)
				assert.Len(t, matchProposals, 1)
				assert.Contains(t, matchProposals, matchProposal2)

				assert.True(t, matchProposal2.IsToBeMade())
			})

			t.Run("does not fail when loading accepted match proposal during draining match proposals for disabled game mode fails", func(t *testing.T) {
				matchProposal1 := matchmaker.NewMatchProposal(p1)
				matchProposal2 := matchmaker.NewMatchProposal(p2)
				matchProposal3 := matchmaker.NewMatchProposal(p3)

				request := &matchmaker.FindMatchesRequest{
					GameModes: []proto.GameMode{
						disabledMode1,
						enabledMode1,
					},
					MatchProposalStatus: matchProposalStatus,
				}

				gameModeLocker.EXPECT().Locker(disabledMode1).Return(lock.NewNoOp())
				gameModeLocker.EXPECT().Locker(enabledMode1).Return(lock.NewNoOp())

				gameModeStatusChecker.EXPECT().IsEnabled(ctx, disabledMode1).Return(false, nil)
				gameModeStatusChecker.EXPECT().IsEnabled(ctx, enabledMode1).Return(true, nil)

				acceptedMatchProposalQueue.EXPECT().Items(disabledMode1).Return([]string{matchProposal1.ID(), matchProposal2.ID()}, nil)
				acceptedMatchProposalQueue.EXPECT().Items(enabledMode1).Return([]string{matchProposal3.ID()}, nil)

				matchProposalRepository.EXPECT().Locker(matchProposal1.ID()).Return(lock.NewNoOp())
				matchProposalRepository.EXPECT().Locker(matchProposal2.ID()).Return(lock.NewNoOp())
				matchProposalRepository.EXPECT().Locker(matchProposal3.ID()).Return(lock.NewNoOp())

				matchProposalRepository.EXPECT().Load(matchProposal1.ID()).Return(nil, someError)
				matchProposalRepository.EXPECT().Load(matchProposal2.ID()).Return(matchProposal2, nil)
				matchProposalRepository.EXPECT().Load(matchProposal3.ID()).Return(matchProposal3, nil)

				playerRepository.EXPECT().Load(p3.Address()).Return(p3, nil)

				notifier.EXPECT().Message(ctx, mmerrors.ErrServerShutdown, player.NewWithAddress(p2.Address()))

				matchProposalRepository.EXPECT().Delete(matchProposal2)

				matchProposalRepository.EXPECT().Save(matchProposal3)

				service := custommatchmaker.NewBackendService(
					cfg,
					matchmakertest.NewAssertErrorContainsLogger(t, "load match proposal to drain"),
					matching,
					notifier,
					playerQueue,
					gameModeLocker,
					gameModeStatusChecker,
					playerRepository,
					matchProposalRepository,
					acceptedMatchProposalQueue,
					acceptTimeouter,
				)

				matchProposals, err := service.FindMatchProposals(ctx, request)
				require.NoError(t, err)
				assert.Len(t, matchProposals, 1)
				assert.Contains(t, matchProposals, matchProposal3)

				assert.True(t, matchProposal3.IsToBeMade())
			})

			t.Run("does not fail when listing accepted match proposals during draining match proposals for disabled game mode fails", func(t *testing.T) {
				matchProposal1 := matchmaker.NewMatchProposal(p1)

				request := &matchmaker.FindMatchesRequest{
					GameModes: []proto.GameMode{
						disabledMode1,
						enabledMode1,
					},
					MatchProposalStatus: matchProposalStatus,
				}

				gameModeLocker.EXPECT().Locker(disabledMode1).Return(lock.NewNoOp())
				gameModeLocker.EXPECT().Locker(enabledMode1).Return(lock.NewNoOp())

				gameModeStatusChecker.EXPECT().IsEnabled(ctx, disabledMode1).Return(false, nil)
				gameModeStatusChecker.EXPECT().IsEnabled(ctx, enabledMode1).Return(true, nil)

				acceptedMatchProposalQueue.EXPECT().Items(disabledMode1).Return([]string{}, someError)
				acceptedMatchProposalQueue.EXPECT().Items(enabledMode1).Return([]string{matchProposal1.ID()}, nil)

				matchProposalRepository.EXPECT().Locker(matchProposal1.ID()).Return(lock.NewNoOp())

				matchProposalRepository.EXPECT().Load(matchProposal1.ID()).Return(matchProposal1, nil)

				playerRepository.EXPECT().Load(p1.Address()).Return(p1, nil)

				matchProposalRepository.EXPECT().Save(matchProposal1)

				service := custommatchmaker.NewBackendService(
					cfg,
					matchmakertest.NewAssertErrorContainsLogger(t, "drain accepted match proposals"),
					matching,
					notifier,
					playerQueue,
					gameModeLocker,
					gameModeStatusChecker,
					playerRepository,
					matchProposalRepository,
					acceptedMatchProposalQueue,
					acceptTimeouter,
				)

				matchProposals, err := service.FindMatchProposals(ctx, request)
				require.NoError(t, err)
				assert.Len(t, matchProposals, 1)
				assert.Contains(t, matchProposals, matchProposal1)

				assert.True(t, matchProposal1.IsToBeMade())
			})

			t.Run("does not fail when checking game mode status fails", func(t *testing.T) {
				matchProposal1 := matchmaker.NewMatchProposal(p1)

				request := &matchmaker.FindMatchesRequest{
					GameModes: []proto.GameMode{
						enabledMode1,
						enabledMode2,
					},
					MatchProposalStatus: matchProposalStatus,
				}

				gameModeLocker.EXPECT().Locker(enabledMode1).Return(lock.NewNoOp())
				gameModeLocker.EXPECT().Locker(enabledMode2).Return(lock.NewNoOp())

				gameModeStatusChecker.EXPECT().IsEnabled(ctx, enabledMode1).Return(false, someError)
				gameModeStatusChecker.EXPECT().IsEnabled(ctx, enabledMode2).Return(true, nil)

				acceptedMatchProposalQueue.EXPECT().Items(enabledMode2).Return([]string{matchProposal1.ID()}, nil)

				matchProposalRepository.EXPECT().Locker(matchProposal1.ID()).Return(lock.NewNoOp())

				matchProposalRepository.EXPECT().Load(matchProposal1.ID()).Return(matchProposal1, nil)

				playerRepository.EXPECT().Load(p1.Address()).Return(p1, nil)

				matchProposalRepository.EXPECT().Save(matchProposal1)

				service := custommatchmaker.NewBackendService(
					cfg,
					matchmakertest.NewAssertErrorContainsLogger(t, "check game mode status"),
					matching,
					notifier,
					playerQueue,
					gameModeLocker,
					gameModeStatusChecker,
					playerRepository,
					matchProposalRepository,
					acceptedMatchProposalQueue,
					acceptTimeouter,
				)

				matchProposals, err := service.FindMatchProposals(ctx, request)
				require.NoError(t, err)
				assert.Len(t, matchProposals, 1)
				assert.Contains(t, matchProposals, matchProposal1)

				assert.True(t, matchProposal1.IsToBeMade())
			})
		})

		t.Run("fails when unsupported match proposal status is requested", func(t *testing.T) {
			request := &matchmaker.FindMatchesRequest{
				GameModes:           []proto.GameMode{enabledMode1, enabledMode2},
				MatchProposalStatus: matchmaker.MatchProposalStatusToBeMade,
			}

			matchProposals, err := service.FindMatchProposals(ctx, request)
			require.ErrorContains(t, err, "unsupported request")
			assert.Empty(t, matchProposals)
		})
	})

	t.Run("release player", func(t *testing.T) {
		t.Run("pushes player back to queue", func(t *testing.T) {
			playerQueue.EXPECT().Push(p1)

			playerRepository.EXPECT().SetStatus(p1, player.PlayerStatus_CONNECTED)

			err := service.ReleasePlayer(ctx, p1)
			require.NoError(t, err)
		})

		t.Run("fails when setting status fails", func(t *testing.T) {
			playerQueue.EXPECT().Push(p1)

			playerRepository.EXPECT().SetStatus(p1, player.PlayerStatus_CONNECTED).Return(someError)

			err := service.ReleasePlayer(ctx, p1)
			require.ErrorIs(t, err, someError)
		})

		t.Run("fails when pushing back to queue fails", func(t *testing.T) {
			playerQueue.EXPECT().Push(p1).Return(someError)

			err := service.ReleasePlayer(ctx, p1)
			require.ErrorIs(t, err, someError)
		})
	})

	t.Run("match found", func(t *testing.T) {
		t.Run("notifies players and schedules timeout", func(t *testing.T) {
			matchProposal := matchmaker.NewMatchProposal(p1, p2)

			data := matchmaker.MatchProcessedData{
				MatchProposal: matchProposal,
			}

			matchProposalRepository.EXPECT().Locker(matchProposal.ID()).Return(lock.NewNoOp())

			matchProposalRepository.EXPECT().Save(matchProposal)

			playerRepository.EXPECT().Save(p1)
			playerRepository.EXPECT().Save(p2)

			notifier.EXPECT().Message(ctx, events.EventFoundMessage{
				PlayerID:   p1.Address(),
				OpponentID: p2.Address(),
				TTL:        acceptanceTimeout,
				Mode:       p1.Mode,
			}, p1)
			notifier.EXPECT().Message(ctx, events.EventFoundMessage{
				PlayerID:   p2.Address(),
				OpponentID: p1.Address(),
				TTL:        acceptanceTimeout,
				Mode:       p2.Mode,
			}, p2)

			playerRepository.EXPECT().SetStatus(p1, player.PlayerStatus_MATCH_FOUND)
			playerRepository.EXPECT().SetStatus(p2, player.PlayerStatus_MATCH_FOUND)

			acceptTimeouter.EXPECT().Schedule(matchProposal)

			err := service.MatchFound(ctx, data)
			require.NoError(t, err)

			assert.Equal(t, matchProposal.ID(), p1.GetMatchProposalID())
			assert.Equal(t, matchProposal.ID(), p2.GetMatchProposalID())
		})

		t.Run("does not notify bot", func(t *testing.T) {
			matchProposal := matchmaker.NewMatchProposal(b1, p1)

			data := matchmaker.MatchProcessedData{
				MatchProposal: matchProposal,
			}

			matchProposalRepository.EXPECT().Locker(matchProposal.ID()).Return(lock.NewNoOp())

			matchProposalRepository.EXPECT().Save(matchProposal)

			playerRepository.EXPECT().Save(p1)

			notifier.EXPECT().Message(ctx, events.EventFoundMessage{
				PlayerID:   p1.Address(),
				OpponentID: b1.Address(),
				TTL:        acceptanceTimeout,
				Mode:       p1.Mode,
			}, p1)

			playerRepository.EXPECT().SetStatus(p1, player.PlayerStatus_MATCH_FOUND)

			acceptTimeouter.EXPECT().Schedule(matchProposal)

			err := service.MatchFound(ctx, data)
			require.NoError(t, err)

			assert.Equal(t, matchProposal.ID(), p1.GetMatchProposalID())
		})

		t.Run("does not fail when setting player status fails", func(t *testing.T) {
			matchProposal := matchmaker.NewMatchProposal(p1, p2)

			data := matchmaker.MatchProcessedData{
				MatchProposal: matchProposal,
			}

			matchProposalRepository.EXPECT().Locker(matchProposal.ID()).Return(lock.NewNoOp())

			matchProposalRepository.EXPECT().Save(matchProposal)

			playerRepository.EXPECT().Save(p1)
			playerRepository.EXPECT().Save(p2)

			notifier.EXPECT().Message(ctx, events.EventFoundMessage{
				PlayerID:   p1.Address(),
				OpponentID: p2.Address(),
				TTL:        acceptanceTimeout,
				Mode:       p1.Mode,
			}, p1)
			notifier.EXPECT().Message(ctx, events.EventFoundMessage{
				PlayerID:   p2.Address(),
				OpponentID: p1.Address(),
				TTL:        acceptanceTimeout,
				Mode:       p2.Mode,
			}, p2)

			playerRepository.EXPECT().SetStatus(p1, player.PlayerStatus_MATCH_FOUND).Return(someError)
			playerRepository.EXPECT().SetStatus(p2, player.PlayerStatus_MATCH_FOUND)

			acceptTimeouter.EXPECT().Schedule(matchProposal)

			service := custommatchmaker.NewBackendService(
				cfg,
				matchmakertest.NewAssertErrorContainsLogger(t, "set player status to 'MATCH_FOUND'"),
				matching,
				notifier,
				playerQueue,
				gameModeLocker,
				gameModeStatusChecker,
				playerRepository,
				matchProposalRepository,
				acceptedMatchProposalQueue,
				acceptTimeouter,
			)

			err := service.MatchFound(ctx, data)
			require.NoError(t, err)
		})

		t.Run("fails when notifying player fails", func(t *testing.T) {
			matchProposal := matchmaker.NewMatchProposal(p1, p2)

			data := matchmaker.MatchProcessedData{
				MatchProposal: matchProposal,
			}

			matchProposalRepository.EXPECT().Locker(matchProposal.ID()).Return(lock.NewNoOp())

			matchProposalRepository.EXPECT().Save(matchProposal)

			playerRepository.EXPECT().Save(p1)

			notifier.EXPECT().Message(ctx, events.EventFoundMessage{
				PlayerID:   p1.Address(),
				OpponentID: p2.Address(),
				TTL:        acceptanceTimeout,
				Mode:       p1.Mode,
			}, p1).Return(someError)

			err := service.MatchFound(ctx, data)
			require.ErrorIs(t, err, someError)
		})

		t.Run("fails when saving player fails", func(t *testing.T) {
			matchProposal := matchmaker.NewMatchProposal(p1, p2)

			data := matchmaker.MatchProcessedData{
				MatchProposal: matchProposal,
			}

			matchProposalRepository.EXPECT().Locker(matchProposal.ID()).Return(lock.NewNoOp())

			matchProposalRepository.EXPECT().Save(matchProposal)

			playerRepository.EXPECT().Save(p1).Return(someError)

			err := service.MatchFound(ctx, data)
			require.ErrorIs(t, err, someError)
		})

		t.Run("fails when getting opponent fails", func(t *testing.T) {
			matchProposal := matchmaker.NewMatchProposal(p1)

			data := matchmaker.MatchProcessedData{
				MatchProposal: matchProposal,
			}

			matchProposalRepository.EXPECT().Locker(matchProposal.ID()).Return(lock.NewNoOp())

			matchProposalRepository.EXPECT().Save(matchProposal)

			err := service.MatchFound(ctx, data)
			require.ErrorContains(t, err, "get opponent")
		})

		t.Run("fails when saving match proposal fails", func(t *testing.T) {
			matchProposal := matchmaker.NewMatchProposal(p1, p2)

			data := matchmaker.MatchProcessedData{
				MatchProposal: matchProposal,
			}

			matchProposalRepository.EXPECT().Locker(matchProposal.ID()).Return(lock.NewNoOp())

			matchProposalRepository.EXPECT().Save(matchProposal).Return(someError)

			err := service.MatchFound(ctx, data)
			require.ErrorIs(t, err, someError)
		})
	})

	t.Run("match made", func(t *testing.T) {
		gameServerInfo := &gameservers.GameServerInfo{
			WS:             "ws",
			ReleaseVersion: "version",
		}

		t.Run("notifies players and deleted match proposal", func(t *testing.T) {
			matchProposal := matchmaker.NewMatchProposal(p1, p2)

			data := matchmaker.MatchProcessedData{
				MatchProposal:  matchProposal,
				GameServerInfo: gameServerInfo,
			}

			matchProposalRepository.EXPECT().Locker(matchProposal.ID()).Return(lock.NewNoOp())

			notifier.EXPECT().Message(ctx, events.EventMadeMessage{
				ServerAddress: "ws?release=version",
				Mode:          p1.Mode,
			}, p1)
			notifier.EXPECT().Message(ctx, events.EventMadeMessage{
				ServerAddress: "ws?release=version",
				Mode:          p2.Mode,
			}, p2)

			playerRepository.EXPECT().SetStatus(p1, player.PlayerStatus_MATCH_DISPATCHED)
			playerRepository.EXPECT().SetStatus(p2, player.PlayerStatus_MATCH_DISPATCHED)

			matchProposalRepository.EXPECT().Delete(matchProposal)

			err := service.MatchMade(ctx, data)
			require.NoError(t, err)
		})

		t.Run("does not notify bot", func(t *testing.T) {
			matchProposal := matchmaker.NewMatchProposal(b1, p1)

			data := matchmaker.MatchProcessedData{
				MatchProposal:  matchProposal,
				GameServerInfo: gameServerInfo,
			}

			matchProposalRepository.EXPECT().Locker(matchProposal.ID()).Return(lock.NewNoOp())

			notifier.EXPECT().Message(ctx, events.EventMadeMessage{
				ServerAddress: "ws?release=version",
				Mode:          p1.Mode,
			}, p1)

			playerRepository.EXPECT().SetStatus(p1, player.PlayerStatus_MATCH_DISPATCHED)

			matchProposalRepository.EXPECT().Delete(matchProposal)

			err := service.MatchMade(ctx, data)
			require.NoError(t, err)
		})

		t.Run("does not fail when deleting match proposal fails", func(t *testing.T) {
			matchProposal := matchmaker.NewMatchProposal(p1, p2)

			data := matchmaker.MatchProcessedData{
				MatchProposal:  matchProposal,
				GameServerInfo: gameServerInfo,
			}

			matchProposalRepository.EXPECT().Locker(matchProposal.ID()).Return(lock.NewNoOp())

			notifier.EXPECT().Message(ctx, events.EventMadeMessage{
				ServerAddress: "ws?release=version",
				Mode:          p1.Mode,
			}, p1)
			notifier.EXPECT().Message(ctx, events.EventMadeMessage{
				ServerAddress: "ws?release=version",
				Mode:          p2.Mode,
			}, p2)

			playerRepository.EXPECT().SetStatus(p1, player.PlayerStatus_MATCH_DISPATCHED)
			playerRepository.EXPECT().SetStatus(p2, player.PlayerStatus_MATCH_DISPATCHED)

			matchProposalRepository.EXPECT().Delete(matchProposal).Return(someError)

			service := custommatchmaker.NewBackendService(
				cfg,
				matchmakertest.NewAssertErrorContainsLogger(t, "delete match proposal when match has been made"),
				matching,
				notifier,
				playerQueue,
				gameModeLocker,
				gameModeStatusChecker,
				playerRepository,
				matchProposalRepository,
				acceptedMatchProposalQueue,
				acceptTimeouter,
			)

			err := service.MatchMade(ctx, data)
			require.NoError(t, err)
		})

		t.Run("does not fail when setting player status fails", func(t *testing.T) {
			matchProposal := matchmaker.NewMatchProposal(p1, p2)

			data := matchmaker.MatchProcessedData{
				MatchProposal:  matchProposal,
				GameServerInfo: gameServerInfo,
			}

			matchProposalRepository.EXPECT().Locker(matchProposal.ID()).Return(lock.NewNoOp())

			notifier.EXPECT().Message(ctx, events.EventMadeMessage{
				ServerAddress: "ws?release=version",
				Mode:          p1.Mode,
			}, p1)
			notifier.EXPECT().Message(ctx, events.EventMadeMessage{
				ServerAddress: "ws?release=version",
				Mode:          p2.Mode,
			}, p2)

			playerRepository.EXPECT().SetStatus(p1, player.PlayerStatus_MATCH_DISPATCHED).Return(someError)
			playerRepository.EXPECT().SetStatus(p2, player.PlayerStatus_MATCH_DISPATCHED)

			matchProposalRepository.EXPECT().Delete(matchProposal)

			service := custommatchmaker.NewBackendService(
				cfg,
				matchmakertest.NewAssertErrorContainsLogger(t, "set player status to 'MATCH_DISPATCHED'"),
				matching,
				notifier,
				playerQueue,
				gameModeLocker,
				gameModeStatusChecker,
				playerRepository,
				matchProposalRepository,
				acceptedMatchProposalQueue,
				acceptTimeouter,
			)

			err := service.MatchMade(ctx, data)
			require.NoError(t, err)
		})

		t.Run("fails when notifying player fails", func(t *testing.T) {
			matchProposal := matchmaker.NewMatchProposal(p1, p2)

			data := matchmaker.MatchProcessedData{
				MatchProposal:  matchProposal,
				GameServerInfo: gameServerInfo,
			}

			matchProposalRepository.EXPECT().Locker(matchProposal.ID()).Return(lock.NewNoOp())

			notifier.EXPECT().Message(ctx, events.EventMadeMessage{
				ServerAddress: "ws?release=version",
				Mode:          p1.Mode,
			}, p1).Return(someError)

			err := service.MatchMade(ctx, data)
			require.ErrorIs(t, err, someError)
		})
	})
}
