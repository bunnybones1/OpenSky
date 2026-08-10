package middleware

var (
	LoggerCtxKey = &contextKey{"Logger"}

	SessionTypeCtxKey = &contextKey{"SessionType"}
	WalletCtxKey      = &contextKey{"Wallet"}  // Ethereum account address (string of hash)
	AccountCtxKey     = &contextKey{"Account"} // OpenSky user account object (*data.Account)
	AppDevCtxKey      = &contextKey{"AppDev"}  // App dev (*data.AppDevKey)
	ServiceCtxKey     = &contextKey{"Service"}
	DatabaseCtxKey    = &contextKey{"DatabaseSession"}
)

type contextKey struct {
	name string
}

func (k *contextKey) String() string {
	return "context value " + k.name
}
