package rpc

import (
	"context"
	"encoding/base64"
	"encoding/json"
	"errors"
	"fmt"
	"reflect"
	"regexp"
	"strings"

	"github.com/upper/db/v4"

	"github.com/horizon-games/OpenSky/api/proto"
	"github.com/horizon-games/OpenSky/api/rpc/rctx"
)

var errMissingCursorFmt = "destination type %T is not configured for pagination"

var (
	maxPageSize uint32 = 200

	defaultPageSize uint32 = 20

	sortOrder_DESC = proto.SortOrder_DESC
	sortOrder_ASC  = proto.SortOrder_ASC

	defaultOrder = sortOrder_DESC
)

var (
	reNotAllowedColumnChars = regexp.MustCompile(`[^a-zA-Z0-9\._]`)
)

type HasCursor interface {
	CursorValue() string
}

type PaginatorOptions struct {
	AddNullsLast bool
}

type Paginator struct {
	page          *proto.Page
	uniqueSortKey *proto.SortBy
	defaultSortBy []*proto.SortBy

	orderByClauses         []interface{}
	invertedOrderByClauses []interface{}
	cursorColumns          []string
	cursorCond             *db.AndExpr
	sortClauses            *db.AndExpr

	options PaginatorOptions

	selector db.Selector
	result   db.Result
}

func NewPaginator(page *proto.Page, uniqueSortKey *proto.SortBy, defaultSortBy ...*proto.SortBy) (*Paginator, error) {
	if page == nil {
		page = &proto.Page{}
	}
	if page.PageSize == nil || *page.PageSize == 0 {
		page.PageSize = &defaultPageSize
	}

	if *page.PageSize > maxPageSize {
		page.PageSize = &maxPageSize
	}

	if err := validateSortBy(uniqueSortKey); err != nil {
		return nil, err
	}
	for _, sortBy := range defaultSortBy {
		if err := validateSortBy(sortBy); err != nil {
			return nil, err
		}
	}
	for _, sortBy := range page.Sort {
		if err := validateSortBy(sortBy); err != nil {
			return nil, err
		}
	}

	if uniqueSortKey == nil || uniqueSortKey.Column == "" {
		return nil, errors.New("missing uniqueSortKey")
	}
	if uniqueSortKey.Order == nil {
		uniqueSortKey.Order = &sortOrder_DESC
	}

	if len(defaultSortBy) < 1 {
		defaultSortBy = []*proto.SortBy{uniqueSortKey}
	}

	if page.Before != nil && page.After != nil {
		return nil, fmt.Errorf("using Before and After in the same query is not allowed")
	}

	z := &Paginator{
		page:          page,
		uniqueSortKey: uniqueSortKey,
		defaultSortBy: defaultSortBy,
	}
	return z, nil
}

func (p *Paginator) SetOptions(options *PaginatorOptions) *Paginator {
	if options != nil {
		p.options = *options
	}
	return p
}

func (p *Paginator) Source(src interface{}) *Paginator {
	switch v := src.(type) {
	case db.Result:
		p.result = v
	case db.Selector:
		p.selector = v
	}
	return p
}

func (p *Paginator) prepareSortKeys() error {
	var err error

	// decoding cursors
	var sortValues []string
	isBefore := false

	switch {
	case p.page.Before != nil:
		sortValues, err = decodeCursor(p.page.Before)
		if err != nil {
			return fmt.Errorf("failed to decode cursor: %w", err)
		}
		isBefore = true
	case p.page.After != nil:
		sortValues, err = decodeCursor(p.page.After)
		if err != nil {
			return fmt.Errorf("failed to decode cursor: %w", err)
		}
	}

	// sort order
	if len(p.page.Sort) == 0 {
		p.page.Sort = p.defaultSortBy
	}

	filteredSort := make([]*proto.SortBy, 0, len(p.page.Sort))
	for i := range p.page.Sort {
		if p.page.Sort[i].Column == "" {
			return errors.New("missing sort key name")
		}
		if p.page.Sort[i].Order == nil {
			p.page.Sort[i].Order = &defaultOrder
		}
		if p.page.Sort[i].Column == p.uniqueSortKey.Column || strings.HasSuffix(p.page.Sort[i].Column, "."+p.uniqueSortKey.Column) {
			p.uniqueSortKey.Order = p.page.Sort[i].Order
			continue // don't use unique column as sort key (at this level)
		}
		filteredSort = append(filteredSort, p.page.Sort[i])
	}
	p.page.Sort = filteredSort

	if len(p.page.Sort) == 1 {
		p.uniqueSortKey.Order = p.page.Sort[0].Order
	}

	// make sure we don't have more cursor values than what we're expecting. we
	// want one value for the unique key and another one for each one of the
	// extra sorting keys.
	if len(sortValues) > len(p.page.Sort)+1 {
		return errors.New("cursor does not match expected values")
	}

	// pick cursor and value
	cursorColumn := p.uniqueSortKey.Column
	cursorColumns := []string{cursorColumn}
	var cursorValue interface{}
	if len(sortValues) > 0 {
		cursorValue = sortValues[0]
		sortValues = sortValues[1:]
	}

	// add sort
	orderByClauses := []interface{}{}
	invertedOrderByClauses := []interface{}{}
	for _, sortBy := range p.page.Sort {
		clause := p.orderByClause(*sortBy, true)
		orderByClauses = append(orderByClauses, clause)

		invertedClause := p.orderByClause(invertSortBy(*sortBy), true)
		invertedOrderByClauses = append(invertedOrderByClauses, invertedClause)

		cursorColumns = append(cursorColumns, sortBy.Column)
	}

	orderByClauses = append(orderByClauses, p.orderByClause(*p.uniqueSortKey, false))                               // add unique key
	invertedOrderByClauses = append(invertedOrderByClauses, p.orderByClause(invertSortBy(*p.uniqueSortKey), false)) // add unique key

	// add cursor condition
	cursorCond := db.And()
	if cursorValue != nil {
		if isBefore {
			if *p.uniqueSortKey.Order == proto.SortOrder_DESC {
				cursorCond = cursorCond.And(db.Cond{
					cursorColumn: db.Lt(cursorValue),
				})
			} else {
				cursorCond = cursorCond.And(db.Cond{
					cursorColumn: db.Gt(cursorValue),
				})
			}
		} else {
			if *p.uniqueSortKey.Order == proto.SortOrder_DESC {
				cursorCond = cursorCond.And(db.Cond{
					cursorColumn: db.Gt(cursorValue),
				})
			} else {
				cursorCond = cursorCond.And(db.Cond{
					cursorColumn: db.Lt(cursorValue),
				})
			}
		}
	}

	p.orderByClauses = orderByClauses
	p.invertedOrderByClauses = invertedOrderByClauses

	p.cursorColumns = cursorColumns
	p.cursorCond = cursorCond

	p.sortClauses = p.buildAmbiguityClauses(0, sortValues)

	return nil
}

func (p *Paginator) buildAmbiguityClauses(i int, sortValues []string) *db.AndExpr {
	if i >= len(p.page.Sort) {
		return p.cursorCond
	}

	isBefore := false
	if p.page.Before != nil {
		isBefore = true
	}

	var sortValue string
	if i < len(sortValues) {
		sortValue = sortValues[i]
	}

	var equalityCond db.Cond

	compCond := db.Or()

	if sortValue != "" {
		if isBefore {
			if *p.page.Sort[i].Order == proto.SortOrder_DESC {
				compCond = compCond.Or(
					db.Cond{
						p.page.Sort[i].Column: db.Lt(sortValue),
					},
				)
			} else {
				compCond = compCond.Or(
					db.Cond{
						p.page.Sort[i].Column: db.Gt(sortValue),
					},
				)
			}
		} else {
			if *p.page.Sort[i].Order == proto.SortOrder_DESC {
				compCond = compCond.Or(
					db.Cond{
						p.page.Sort[i].Column: db.Gt(sortValue),
					},
				)
			} else {
				compCond = compCond.Or(
					db.Cond{
						p.page.Sort[i].Column: db.Lt(sortValue),
					},
				)
			}
		}

		equalityCond = db.Cond{
			p.page.Sort[i].Column: sortValue,
		}

		if (isBefore && *p.page.Sort[i].Order == proto.SortOrder_ASC) || (!isBefore && *p.page.Sort[i].Order == proto.SortOrder_DESC) {
			compCond = compCond.Or(db.Cond{
				p.page.Sort[i].Column: db.IsNull(),
			})
		}
	}

	nextCond := p.buildAmbiguityClauses(i+1, sortValues)

	return db.And(db.Or(compCond, db.And(equalityCond, nextCond)))
}

func (p *Paginator) Page() *proto.Page {
	return p.page
}

func (p *Paginator) Get(ctx context.Context, dst interface{}) error {
	if err := p.prepareSortKeys(); err != nil {
		return err
	}

	switch {
	case p.selector != nil:
		return p.querySelector(ctx, dst)
	case p.result != nil:
		return p.queryResult(ctx, dst)
	default:
		return errors.New("missing selector or result")
	}
}

func (p *Paginator) querySelector(ctx context.Context, dst interface{}) error {
	repo := rctx.DBContext(ctx)

	sel := p.selector

	if p.page.After != nil {
		sel = sel.OrderBy(p.invertedOrderByClauses...)
	} else {
		sel = sel.OrderBy(p.orderByClauses...)
	}

	// set an alias for the cursor
	textColumns := make([]string, len(p.cursorColumns))
	for i := range p.cursorColumns {
		// casting cursor values to text, prevents errors with JavaScript representation
		textColumns[i] = p.cursorColumns[i] + "::text"
	}
	sel = sel.Columns(db.Raw(fmt.Sprintf("json_build_array(%s) AS cursor", strings.Join(textColumns, ", "))))

	// append a disambiguation clause at the end
	sel = sel.And(p.sortClauses)

	// extract value of cursor column, this field matches the column defined in
	// the Cursor struct
	sel = sel.Limit(int(*p.page.PageSize) + 1)

	// wrapping the query on a subquery (we need to do this to keep sane orders
	// when using the Before cursor)
	wrapper := repo.SQL().
		SelectFrom(sel).
		As("_page")

	if len(p.orderByClauses) > 0 {
		if p.page.After != nil {
			wrapper = wrapper.OrderBy(p.orderByClauses...)
		}
	}

	if err := wrapper.All(dst); err != nil {
		return err
	}

	_, err := p.attachCursor(dst)
	if err != nil {
		return err
	}

	return nil
}

func (p *Paginator) queryResult(ctx context.Context, dst interface{}) error {
	repo := rctx.DBContext(ctx)

	res := p.result

	if p.page.After != nil {
		res = res.OrderBy(p.invertedOrderByClauses...)
	} else {
		res = res.OrderBy(p.orderByClauses...)
	}

	// set an alias for the cursor
	textColumns := make([]string, len(p.cursorColumns))
	for i := range p.cursorColumns {
		// casting cursor values to text, prevents errors with JavaScript representation
		textColumns[i] = p.cursorColumns[i] + "::text"
	}
	res = res.Select("*", db.Raw(fmt.Sprintf("json_build_array(%s) AS cursor", strings.Join(textColumns, ", "))))

	// append a disambiguation clause at the end
	res = res.And(p.sortClauses)

	// extract value of cursor column, this field matches the column defined in
	// the Cursor struct
	res = res.Limit(int(*p.page.PageSize) + 1)

	// wrapping the query on a subquery (we need to do this to keep sane orders
	// when using the Before cursor)
	wrapper := repo.SQL().
		SelectFrom(res).
		As("_page")

	if len(p.orderByClauses) > 0 {
		if p.page.After != nil {
			wrapper = wrapper.OrderBy(p.orderByClauses...)
		}
	}

	if err := wrapper.All(dst); err != nil {
		return err
	}

	_, err := p.attachCursor(dst)
	if err != nil {
		return err
	}

	return nil
}

func (p *Paginator) TranslateSort(trs map[string]string) *Paginator {
	sanitizedSortBy := make([]*proto.SortBy, 0, len(p.page.Sort))
	for i := range p.page.Sort {
		for m, tr := range trs {
			if p.page.Sort[i].Column == m || p.page.Sort[i].Column == tr {
				sortBy := p.page.Sort[i]
				sortBy.Column = tr

				sanitizedSortBy = append(sanitizedSortBy, sortBy)
			}
		}
	}
	p.page.Sort = sanitizedSortBy
	return p
}

func (p *Paginator) attachCursor(dst interface{}) (*proto.Page, error) {
	dstv := reflect.Indirect(reflect.ValueOf(dst))

	p.page.HasBefore = new(bool)
	p.page.HasAfter = new(bool)

	// If we have a cursor it's likely we obtained it from querying a page with a
	// specific result. We're not checking if the cursor is valid, let's just
	// assume it is.
	if p.page.After != nil {
		*p.page.HasBefore = true
	}
	if p.page.Before != nil {
		*p.page.HasAfter = true
	}

	if dstv.Len() < 1 {
		p.page.Before = nil
		p.page.After = nil
		return p.page, nil
	}

	if dstv.Len() > int(*p.page.PageSize) {
		// this means we have one more item than what the user requested, which is
		// a clear indicator for HasAfter/HasBefore. we can discard the extra
		// element and set the flag.
		if p.page.After != nil {
			dstv.Set(dstv.Slice(dstv.Len()-int(*p.page.PageSize), dstv.Len())) // remove from head
			*p.page.HasAfter = true
		} else {
			dstv.Set(dstv.Slice(0, int(*p.page.PageSize))) // remove from tail
			*p.page.HasBefore = true
		}
	}

	// Assigning before/after value for cursors
	p.page.Before = nil
	if first, ok := dstv.Index(0).Interface().(HasCursor); ok {
		value := encodeCursor(first.CursorValue())
		p.page.Before = &value
	}

	p.page.After = nil
	if last, ok := dstv.Index(dstv.Len() - 1).Interface().(HasCursor); ok {
		value := encodeCursor(last.CursorValue())
		p.page.After = &value
	}

	if p.page.After == nil || p.page.Before == nil {
		return nil, fmt.Errorf(errMissingCursorFmt, dstv.Index(0).Interface())
	}

	if *p.page.After == "" || *p.page.Before == "" {
		return nil, fmt.Errorf(errMissingCursorFmt, dstv.Index(0).Interface())
	}

	return p.page, nil
}

func (p *Paginator) orderByClause(s proto.SortBy, includeNULL bool) interface{} {
	clause := removeTableAlias(s.Column)

	switch *s.Order {
	case proto.SortOrder_DESC:
		if includeNULL && p.options.AddNullsLast {
			clause = fmt.Sprintf("%s DESC NULLS LAST", clause)
		} else {
			clause = fmt.Sprintf("%s DESC", clause)
		}
	case proto.SortOrder_ASC:
		if includeNULL && p.options.AddNullsLast {
			clause = fmt.Sprintf("%s ASC NULLS LAST", clause)
		} else {
			clause = fmt.Sprintf("%s ASC", clause)
		}
	}

	return db.Raw(clause)
}

func decodeCursor(in *string) ([]string, error) {
	if in == nil || *in == "" {
		return nil, nil
	}

	decoded, err := base64.StdEncoding.DecodeString(*in)
	if err != nil {
		return nil, err
	}

	dest := []string{}
	if err := json.Unmarshal([]byte(decoded), &dest); err != nil {
		return nil, err
	}

	return dest, nil
}

func encodeCursor(src string) string {
	return base64.StdEncoding.EncodeToString([]byte(src))
}

func validateSortBy(sortBy *proto.SortBy) error {
	if reNotAllowedColumnChars.MatchString(sortBy.Column) {
		return fmt.Errorf("wrong format for column %q", sortBy.Column)
	}
	return nil
}

func invertSortBy(s proto.SortBy) proto.SortBy {
	v := proto.SortBy{Column: s.Column}
	if *s.Order == proto.SortOrder_DESC {
		v.Order = &sortOrder_ASC
	} else {
		v.Order = &sortOrder_DESC
	}
	return v
}

func removeTableAlias(s string) string {
	column := strings.SplitN(s, ".", 2)
	if len(column) > 1 {
		return column[1]
	}
	return column[0]
}
