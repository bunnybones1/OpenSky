package data

import (
	"github.com/upper/db/v4"

	"github.com/horizon-games/OpenSky/api/proto"
)

type Transaction struct {
	*proto.Transaction
}

type TransactionStore struct {
	db.Collection
}

func (t *Transaction) Store(sess db.Session) db.Store {
	return DB.Transactions(sess)
}

func (t *TransactionStore) FindOne(conds ...interface{}) (*Transaction, error) {
	var txn *Transaction

	err := t.Find(conds...).Limit(1).One(&txn)
	if err != nil {
		return nil, err
	}

	return txn, nil
}
