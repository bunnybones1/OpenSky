package signals

const (
	SAME_IP                   = "same ip"
	SAME_IP_SAME_CREATION_DAY = "same ip same account date"
)

// IP address related signals
type SameIP struct {
	NumAccountsUsingSameIP int `json:"accountCount"`
}

// number of accounts created the same day and using same IP
type SameIPSameCreationDay struct {
	NumAccountsUsingSameIP int `json:"accountCount"`
}
