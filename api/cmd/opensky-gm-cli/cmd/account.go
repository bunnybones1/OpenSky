package cmd

import (
	"encoding/json"
	"fmt"
	"strconv"
	"strings"
	"time"

	"github.com/spf13/cobra"

	"github.com/horizon-games/OpenSky/api/proto"
)

var (
	// flags
	accountAddress  string
	accountUsername string
	lockDuration    time.Duration
	playerRank      proto.PlayerRank
	gameMode        proto.GameMode
	rankPoints      int32
)

func accountCmd() *cobra.Command {
	cmd := &cobra.Command{
		Use:   "account",
		Short: "Manage user accounts",
	}

	cmd.AddCommand(
		accountFind(),
		accountRename(),
		accountUnlockBaseCards(),
		accountSetRank(),
	)

	return cmd
}

func accountFind() *cobra.Command {
	cmd := &cobra.Command{
		Use:   "find [address | username]",
		Short: "Find user account",
		Args:  cobra.MatchAll(cobra.ExactArgs(1), cobra.OnlyValidArgs),
		RunE: func(cmd *cobra.Command, args []string) error {
			if len(args[0]) == 42 && strings.HasPrefix(args[0], "0x") {
				accountAddress = args[0]
			} else {
				accountUsername = args[0]
			}
			account, err := swAPIClient.GMFindAccount(swAPIAuthCtx, &accountUsername, &accountAddress)
			err = parseErr(err)
			if err != nil {
				return err
			}

			v, _ := json.MarshalIndent(account, "", "\t")
			fmt.Println(string(v))

			return nil
		},
	}

	return cmd
}

func accountRename() *cobra.Command {
	cmd := &cobra.Command{
		Use:   "rename [old-name | address] new-name",
		Short: "Rename user account",
		RunE: func(cmd *cobra.Command, args []string) error {
			if len(args[0]) == 42 && strings.HasPrefix(args[0], "0x") {
				accountAddress = args[0]
			} else {
				accountUsername = args[0]
			}
			accountNewName := args[1]

			var lockUntil *time.Time
			if lockDuration > 0 {
				v := time.Now().UTC().Truncate(time.Second).Add(lockDuration)
				lockUntil = &v
			}

			account, err := swAPIClient.GMRenameAccount(swAPIAuthCtx, &accountUsername, &accountAddress, accountNewName, lockUntil)
			err = parseErr(err)
			if err != nil {
				return err
			}

			fmt.Println("Account renamed")
			v, _ := json.MarshalIndent(account, "", "\t")
			fmt.Println(string(v))

			return nil
		},
		Args: cobra.MatchAll(cobra.ExactArgs(2), cobra.OnlyValidArgs),
	}

	cmd.Flags().DurationVar(&lockDuration, "lock-duration", 0, "lock account name change for duration, eg. '2h30m' - 2.5h, '240h' - 10 days")

	return cmd
}

func accountUnlockBaseCards() *cobra.Command {
	cmd := &cobra.Command{
		Use:   "unlock-all-base-cards [address]",
		Short: "Unlocks all currently valid base cards on account",
		Args:  cobra.MatchAll(cobra.ExactArgs(1), cobra.OnlyValidArgs),
		RunE: func(cmd *cobra.Command, args []string) error {
			accountAddress = args[0]
			_, err := swAPIClient.GMUnlockAllBaseCards(swAPIAuthCtx, &accountAddress)
			err = parseErr(err)
			if err != nil {
				return err
			}

			fmt.Println("All base cards unlocked for account ", accountAddress)

			return nil
		},
	}

	return cmd
}

func accountSetRank() *cobra.Command {
	cmd := &cobra.Command{
		Use:   "set-rank [address] [gamemode] [rank] [(optional) rankpoints]",
		Short: "Sets an account to a specific PlayerRank & rankpoints for a ranked gamemode. If rankpoints aren't specified, default is 0.",
		Args:  cobra.RangeArgs(3, 4),
		RunE: func(cmd *cobra.Command, args []string) error {
			accountAddress = args[0]
			lowercaseGameModeArg := strings.ToLower(args[1])
			if lowercaseGameModeArg == "constructed" {
				gameMode = proto.GameMode_RANKED_CONSTRUCTED
			} else if lowercaseGameModeArg == "discovery" {
				gameMode = proto.GameMode_RANKED_DISCOVERY
			} else {
				return fmt.Errorf("invalid game mode %s.\nValid modes are: \n - constructed\n - discovery", args[1])
			}

			lowercaseRankArg := strings.ToLower(args[2])
			for rankName, rankNumber := range proto.PlayerRank_value {
				if strings.ToLower(rankName) == lowercaseRankArg {
					playerRank = proto.PlayerRank(rankNumber)
				}
			}
			if playerRank == proto.PlayerRank_UNKNOWN {
				validRanks := ""
				for _, rank := range proto.PlayerRank_name {
					validRanks += " - " + strings.TrimPrefix(strings.ToLower(rank), "PlayerRank_") + "\n"
				}
				return fmt.Errorf("invalid player rank %s. Valid ranks are: \n%s", args[2], validRanks)
			}

			if len(args) == 3 {
				rankPoints = 0
			} else {
				if playerRank == proto.PlayerRank_MASTER || playerRank == proto.PlayerRank_GRANDWEAVER {
					return fmt.Errorf("Rankpoints cannot be set for Master & Grandmaster.")
				}
				rankPoints64, err := strconv.ParseFloat(args[3], 32)
				if err != nil {
					return fmt.Errorf("invalid rank points float value %s", args[3])
				}
				rankPoints = int32(rankPoints64)
			}
			_, err := swAPIClient.GMSetRP(swAPIAuthCtx, &accountAddress, &gameMode, &rankPoints)
			err = parseErr(err)
			if err != nil {
				return err
			}

			fmt.Printf("Set ranked %s rank to %s and points to %d for account %s\n", gameMode, playerRank, rankPoints, accountAddress)

			return nil
		},
	}

	return cmd
}
