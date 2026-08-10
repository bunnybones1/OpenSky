package matchmakertest

import (
	"encoding/json"
	"testing"

	"github.com/rs/zerolog"
	"github.com/stretchr/testify/require"
)

func NewErrorLogger(t *testing.T) zerolog.Logger {
	return zerolog.New(zerolog.NewTestWriter(t)).Level(zerolog.ErrorLevel)
}

func NewAssertNoErrorLogger(t *testing.T) zerolog.Logger {
	return zerolog.New(&assertNoLogLogger{t: t}).Level(zerolog.ErrorLevel)
}

type assertNoLogLogger struct {
	t *testing.T
}

func (l *assertNoLogLogger) Write(p []byte) (n int, err error) {
	l.t.Errorf("unexpected log:\n%s", p)

	return len(p), nil
}

func NewAssertErrorContainsLogger(t *testing.T, messages ...string) zerolog.Logger {
	logger := &assertContainsLogger{
		t:        t,
		messages: messages,
	}

	t.Cleanup(func() {
		require.Equalf(t, len(messages), logger.counter, "expected logs have not been triggered")
	})

	return zerolog.New(logger).
		Level(zerolog.ErrorLevel)
}

type assertContainsLogger struct {
	t        *testing.T
	messages []string
	counter  int
}

func (l *assertContainsLogger) Write(p []byte) (n int, err error) {
	require.Less(l.t, l.counter, len(l.messages))

	var log *logEvent

	err = json.Unmarshal(p, &log)
	require.NoError(l.t, err)

	require.Contains(l.t, log.Message, l.messages[l.counter])

	l.counter++

	return len(p), nil
}

type logEvent struct {
	Message string `json:"message"`
}
