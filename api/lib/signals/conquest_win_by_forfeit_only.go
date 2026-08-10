package signals

const (
	CONQUEST_WIN_BY_FORFEIT_ONLY          = "won conquest by forfeits only"
	CONQUEST_WIN_BY_FORFEIT_ONLY_2_IN_ROW = "won 2 conquest in a row by forfeits only"
	CONQUEST_WIN_BY_FORFEIT_ONLY_5_IN_ROW = "won 5 conquest in a row by forfeits only"
)

// Win conquest by forfeits only
type ConquestWinByForfeitOnly struct {
	ForfeitRate float64 `json:"forfeitRate"`
}
