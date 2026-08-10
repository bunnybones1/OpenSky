package ranking

import (
	"encoding/json"
	"fmt"
)

func (s State) MarshalJSON() ([]byte, error) {
	values := []float64{
		s.Win.Float64(),
		s.R,
		s.RD,
		float64(s.RP),
	}
	return json.Marshal(values)
}

func (s *State) UnmarshalJSON(in []byte) error {
	values := []float64{}
	if err := json.Unmarshal(in, &values); err != nil {
		return err
	}
	if len(values) == 0 {
		return nil
	}
	if len(values) != 4 {
		return fmt.Errorf("expecting exactly 4 values, got %d", len(values))
	}
	s.Win = NewOutcome(values[0])
	s.R = values[1]
	s.RD = values[2]
	s.RP = int32(values[3])
	return nil
}
