package ranking

import (
	"encoding/json"
	"testing"

	"github.com/stretchr/testify/assert"
)

func TestEncode(t *testing.T) {
	{
		s := NewRankState(Win, 1.0, 2.0, 200)
		e, err := json.Marshal(s)
		assert.NoError(t, err)
		assert.JSONEq(t, `[1.0, 1.0, 2.0, 200]`, string(e))
	}
	{
		s := NewRankState(Loss, 4.0, 1.0, 300)
		e, err := json.Marshal(s)
		assert.NoError(t, err)
		assert.JSONEq(t, `[0.0, 4.0, 1.0, 300]`, string(e))
	}
	{
		s := NewRankState(Draw, 21.1, 14.2, 100)
		e, err := json.Marshal(s)
		assert.NoError(t, err)
		assert.JSONEq(t, `[0.5, 21.1, 14.2, 100]`, string(e))
	}
	{
		s := State{}
		e, err := json.Marshal(s)
		assert.NoError(t, err)
		assert.JSONEq(t, `[-1.0, 0, 0, 0]`, string(e))
	}
}

func TestDecode(t *testing.T) {
	{
		s := State{}
		err := json.Unmarshal([]byte(`null`), &s)
		assert.NoError(t, err)
		assert.Equal(t, OutcomeUndefined, s.Win)
		assert.Equal(t, float64(0), s.R)
		assert.Equal(t, float64(0), s.RD)
		assert.Equal(t, int32(0), s.RP)
	}
	{
		s := State{}
		err := json.Unmarshal([]byte(`[1.0, 12, 31, 200]`), &s)
		assert.NoError(t, err)
		assert.Equal(t, Win, s.Win)
		assert.Equal(t, float64(12), s.R)
		assert.Equal(t, float64(31), s.RD)
		assert.Equal(t, int32(200), s.RP)
	}
	{
		s := State{}
		err := json.Unmarshal([]byte(`[0.0, 12.22, 31.11, 200]`), &s)
		assert.NoError(t, err)
		assert.Equal(t, Loss, s.Win)
		assert.Equal(t, float64(12.22), s.R)
		assert.Equal(t, float64(31.11), s.RD)
		assert.Equal(t, int32(200), s.RP)
	}
	{
		s := State{}
		err := json.Unmarshal([]byte(`[0.5, 12.22, 31.11, 200]`), &s)
		assert.NoError(t, err)
		assert.Equal(t, Draw, s.Win)
		assert.Equal(t, float64(12.22), s.R)
		assert.Equal(t, float64(31.11), s.RD)
		assert.Equal(t, int32(200), s.RP)
	}
	{
		s := State{}
		err := json.Unmarshal([]byte(`[0.15, 12.22, 31.11, 200]`), &s)
		assert.NoError(t, err)
		assert.Equal(t, OutcomeUndefined, s.Win)
		assert.Equal(t, float64(12.22), s.R)
		assert.Equal(t, float64(31.11), s.RD)
		assert.Equal(t, int32(200), s.RP)
	}
}
