package migrations

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"os"
	"sort"
	"strings"

	"github.com/pressly/goose"
	"github.com/upper/db/v4/adapter/postgresql"

	"github.com/horizon-games/OpenSky/api/proto"
)

type Account struct {
	Signer  proto.Hash `json:"signer"`
	Count   int        `json:"count"`
	Details Details    `json:"detail"`
}

type Detail struct {
	Wallet proto.Hash `json:"wallet"`
	Block  int64      `json:"block"`
	Delta  string     `json:"delta"`
	W      proto.Hash `json:"w"`
	B      int64      `json:"b"`
}

type Details []Detail

func (d *Details) UnmarshalJSON(src []byte) error {
	var val []Detail
	err := json.Unmarshal(src, &val)
	if err != nil {
		return err
	}
	for i := range val {
		if val[i].B > 0 {
			val[i].Block = val[i].B
		}
		if val[i].W.IsValidAddress() {
			val[i].Wallet = val[i].W
		}
	}

	sort.SliceStable(val, func(i, j int) bool {
		return val[i].Block >= val[j].Block
	})

	*d = Details(val)

	return nil
}

func init() {
	goose.AddMigration(Up0045, Down0045)
}

func Up0045(tx *sql.Tx) error {
	jsonFile, err := os.Open("data/schema/migrations/accounts.json")
	if err != nil {
		log.Fatal(err)
		return err
	}

	byteValue, err := io.ReadAll(jsonFile)
	if err != nil {
		log.Fatal(err)
		return err
	}

	var accounts []Account

	err = json.Unmarshal(byteValue, &accounts)
	if err != nil {
		log.Fatal(err)
		return err
	}

	var query strings.Builder

	query.WriteString("SELECT CASE ")

	for i, acc := range accounts {
		if len(acc.Details) <= 1 {
			continue
		}
		for _, d := range acc.Details {
			query.WriteString(fmt.Sprintf("WHEN address = '%s' THEN %d ", d.Wallet, i))
		}
	}
	query.WriteString("END AS signer_no, COUNT(address) AS account_count FROM accounts GROUP BY 1 HAVING COUNT(address) = 1")

	sess, err := postgresql.NewTx(tx)
	if err != nil {
		return err
	}

	rows, err := sess.SQL().Query(query.String())
	if err != nil {
		return err
	}

	var signerAddrs struct {
		SignerNo     int `db:"signer_no"`
		AccountCount int `db:"account_count"`
	}

	var accountsToUpdate []Account

	for rows.Next() {
		err = rows.Scan(&signerAddrs.SignerNo, &signerAddrs.AccountCount)
		if err != nil {
			return err
		}
		accountsToUpdate = append(accountsToUpdate, accounts[signerAddrs.SignerNo])
	}

	if len(accountsToUpdate) == 0 {
		return nil
	}

	// Don't check constraints for each query - check the state when we commit
	_, err = sess.SQL().Exec("SET CONSTRAINTS ALL DEFERRED")
	if err != nil {
		return err
	}

	// account mapping
	_, err = sess.SQL().Exec("CREATE TEMPORARY TABLE account_address_mapping(old_address varchar(42), new_address varchar(42))")
	if err != nil {
		return err
	}
	var mappingInsert strings.Builder
	mappingInsert.WriteString("INSERT INTO account_address_mapping(old_address, new_address) VALUES ")
	for i := range accountsToUpdate {
		for j := range accountsToUpdate[i].Details {
			if j == 0 {
				continue
			}
			mappingInsert.WriteString(fmt.Sprintf("('%s', '%s'),", accountsToUpdate[i].Details[j].Wallet, accountsToUpdate[i].Details[0].Wallet))

		}

	}
	_, err = sess.SQL().Exec(strings.TrimRight(mappingInsert.String(), ","))
	if err != nil {
		return err
	}

	// actual address update
	_, err = sess.SQL().Exec("UPDATE accounts SET address = new_address FROM account_address_mapping WHERE address = account_address_mapping.old_address")
	if err != nil {
		return err
	}

	_, err = sess.SQL().Exec("UPDATE account_stats SET account_address = new_address FROM account_address_mapping WHERE account_address = old_address")
	if err != nil {
		return err
	}

	_, err = sess.SQL().Exec("DELETE FROM conquests WHERE account_address IN (SELECT old_address FROM account_address_mapping)")
	if err != nil {
		return err
	}

	_, err = sess.SQL().Exec("UPDATE cookie_policies SET account_address = new_address FROM account_address_mapping WHERE account_address = old_address")
	if err != nil {
		return err
	}

	_, err = sess.SQL().Exec("UPDATE deck_ranks SET highest_player_address = new_address FROM account_address_mapping WHERE highest_player_address = old_address")
	if err != nil {
		return err
	}

	_, err = sess.SQL().Exec("UPDATE decks SET account_address = new_address FROM account_address_mapping WHERE account_address = old_address")
	if err != nil {
		return err
	}

	_, err = sess.SQL().Exec("UPDATE feed_events SET account_address = new_address FROM account_address_mapping WHERE account_address = old_address")
	if err != nil {
		return err
	}

	_, err = sess.SQL().Exec("DELETE FROM item_summaries WHERE account_address IN (SELECT old_address FROM account_address_mapping)")
	if err != nil {
		return err
	}

	_, err = sess.SQL().Exec("UPDATE item_summaries SET account_address = new_address FROM account_address_mapping WHERE account_address = old_address")
	if err != nil {
		return err
	}

	_, err = sess.SQL().Exec("DELETE FROM items WHERE id IN (SELECT i.id FROM items i JOIN account_address_mapping aam ON i.account_address = aam.new_address JOIN items i2 ON aam.old_address = i2.account_address AND i.token_id = i2.token_id)")
	if err != nil {
		return err
	}

	_, err = sess.SQL().Exec("UPDATE items SET account_address = new_address FROM account_address_mapping WHERE account_address = old_address")
	if err != nil {
		return err
	}

	_, err = sess.SQL().Exec("UPDATE matches SET p1_address = new_address FROM account_address_mapping WHERE p1_address = old_address")
	if err != nil {
		return err
	}

	_, err = sess.SQL().Exec("UPDATE matches SET p2_address = new_address FROM account_address_mapping WHERE p2_address = old_address")
	if err != nil {
		return err
	}

	_, err = sess.SQL().Exec("UPDATE user_storage SET user_address = new_address FROM account_address_mapping WHERE user_address = old_address")
	if err != nil {
		return err
	}

	return nil
}

func Down0045(tx *sql.Tx) error {
	return nil
}
