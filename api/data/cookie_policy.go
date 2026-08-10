package data

import (
	"github.com/horizon-games/OpenSky/api/proto"
	"github.com/upper/db/v4"
)

type CookiePolicy struct {
	*proto.CookiePolicy
}

func (c *CookiePolicy) Store(sess db.Session) db.Store {
	return DB.CookiePolicies(sess)
}
