package data

import (
	"errors"

	"github.com/rs/zerolog"
	"github.com/upper/db/v4"
)

type QueryLogger struct {
	zerolog.Logger
}

func (q *QueryLogger) logEvent(ev *zerolog.Event, v ...interface{}) {
	if len(v) < 1 {
		return
	}

	if m, ok := v[0].(*db.QueryStatus); ok {
		ev = ev.Uint64("session_id", m.SessID)
		ev = ev.Uint64("transaction_id", m.TxID)
		ev = ev.Str("query", m.Query())
		if len(m.Args) > 0 {
			ev = ev.Interface("args", m.Args)
		}
		if !m.End.IsZero() && !m.Start.IsZero() {
			ev = ev.TimeDiff("elapsed_ms", m.End, m.Start)
		}
		if m.Err != nil {
			ev = ev.Err(m.Err)
		}
		if stack := m.Stack(); len(stack) > 2 {
			stack = stack[2:] // skipping this logger.
			if len(stack) > 5 {
				stack = stack[:5]
			}
			ev = ev.Strs("stack", stack)
		}
	} else {
		ev.Interface("payload", v[0])
	}

	ev.Send()
}

func (q *QueryLogger) logEventf(ev *zerolog.Event, f string, v ...interface{}) {
	ev.Msgf(f, v...)
}

func (q *QueryLogger) Fatal(v ...interface{}) {
	q.logEvent(q.Logger.Fatal(), v...)
}

func (q *QueryLogger) Fatalf(f string, v ...interface{}) {
	q.logEventf(q.Logger.Fatal(), f, v...)
}

func (q *QueryLogger) Print(v ...interface{}) {
	if len(v) < 1 {
		return
	}
	if m, ok := v[0].(*db.QueryStatus); ok {
		if m.Err != nil {
			if errors.Is(m.Err, db.ErrWarnSlowQuery) {
				q.logEvent(q.Logger.Info(), v...)
				return
			}
			q.logEvent(q.Logger.Error(), v...)
			return
		}
	}
	q.logEvent(q.Logger.Debug(), v...)
}

func (q *QueryLogger) Printf(f string, v ...interface{}) {
	q.logEventf(q.Logger.Info(), f, v...)
}

func (q *QueryLogger) Panic(v ...interface{}) {
	q.logEvent(q.Logger.Panic(), v...)
}

func (q *QueryLogger) Panicf(f string, v ...interface{}) {
	q.logEventf(q.Logger.Panic(), f, v...)
}
