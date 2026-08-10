package store

import (
	"encoding/json"
	"reflect"
	"sync"
	"time"
)

type memStore struct {
	values map[string]interface{}
	ttl    map[string]time.Time
	mu     sync.Mutex
}

func NewMemStore() Store {
	return &memStore{}
}

func (s *memStore) MapLoad(id string, key string, dest interface{}) error {
	s.mu.Lock()
	defer s.mu.Unlock()

	if s.values == nil {
		s.values = make(map[string]interface{})
	}

	if _, ok := s.values[id].(map[string]interface{}); !ok {
		return ErrNoSuchItem
	}

	if v, ok := s.values[id].(map[string]interface{})[key]; ok {
		return json.Unmarshal(v.([]byte), dest)
	}

	return ErrNoSuchItem
}

func (s *memStore) Load(id string, dest interface{}) error {
	s.mu.Lock()
	defer s.mu.Unlock()

	if s.values == nil {
		s.values = make(map[string]interface{})
	}

	if v, ok := s.values[id]; ok {
		destV := reflect.ValueOf(dest).Elem()
		destV.Set(reflect.ValueOf(v))
		return nil
	}

	return ErrNoSuchItem
}

func (s *memStore) MapStore(id string, key string, value interface{}) error {
	s.mu.Lock()
	defer s.mu.Unlock()

	if s.values == nil {
		s.values = make(map[string]interface{})
	}

	if s.values[id] == nil {
		s.values[id] = map[string]interface{}{}
	}

	buf, err := json.Marshal(value)
	if err != nil {
		return err
	}

	s.values[id].(map[string]interface{})[key] = buf

	return nil
}

func (s *memStore) Store(id string, value interface{}) error {
	s.mu.Lock()
	defer s.mu.Unlock()

	if s.values == nil {
		s.values = make(map[string]interface{})
	}

	s.values[id] = value

	return nil
}

func (s *memStore) StoreTTL(id string, value interface{}, ttl time.Duration) error {
	s.mu.Lock()
	defer s.mu.Unlock()

	if s.values == nil {
		s.values = make(map[string]interface{})
	}

	s.values[id] = value
	if s.ttl == nil {
		s.ttl = make(map[string]time.Time)
	}
	s.ttl[id] = time.Now().Add(ttl)
	return nil
}

func (s *memStore) Exists(id string) (bool, error) {
	s.mu.Lock()
	defer s.mu.Unlock()

	if _, ok := s.values[id]; ok {
		// check if key expired from ttl
		ttl, ok := s.ttl[id]
		if !ok {
			return true, nil
		}
		if ttl.Before(time.Now()) {
			_ = s.Delete(id)
			return false, ErrNoSuchItem
		}
		return true, nil
	}
	return false, nil
}

func (s *memStore) Delete(id string) error {
	s.mu.Lock()
	defer s.mu.Unlock()

	s.values[id] = nil

	delete(s.values, id)
	delete(s.ttl, id)

	return nil
}

func (s *memStore) Range(list string) ([]string, error) {
	s.mu.Lock()
	defer s.mu.Unlock()

	if s.values == nil {
		s.values = make(map[string]interface{})
	}

	if values, ok := s.values[list].([]string); ok {
		return values, nil
	}

	return nil, nil
}

func (s *memStore) RangeDelete(list string, members ...string) error {
	s.mu.Lock()
	defer s.mu.Unlock()

	if s.values == nil {
		s.values = make(map[string]interface{})
	}

	if s.values[list] == nil {
		return nil
	}

	values := s.values[list].([]string)
	valid := map[string]bool{}

	for _, value := range values {
		valid[value] = true
	}

	for _, member := range members {
		valid[member] = false
	}

	filtered := []string{}
	for member, isValid := range valid {
		if isValid {
			filtered = append(filtered, member)
		}
	}
	s.values[list] = filtered

	return nil
}

func (s *memStore) Increase(id string) (int, error) {
	s.mu.Lock()
	defer s.mu.Unlock()

	if s.values == nil {
		s.values = make(map[string]interface{})
	}

	if v, ok := s.values[id]; ok {
		i, isInt := v.(int)
		if !isInt {
			return 0, ErrItemNotInt
		}
		s.values[id] = i + 1
		return i + 1, nil
	}
	s.values[id] = 1
	return 1, nil
}

func (s *memStore) SetTTL(id string, ttl time.Duration) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	if _, ok := s.values[id]; !ok {
		return ErrNoSuchItem
	}
	if s.ttl == nil {
		s.ttl = make(map[string]time.Time)
	}
	s.ttl[id] = time.Now().Add(ttl)
	return nil
}

func (s *memStore) TTL(id string) (time.Duration, error) {
	s.mu.Lock()
	defer s.mu.Unlock()

	if s.ttl == nil {
		return 0, ErrNoSuchItem
	}

	if ttl, ok := s.ttl[id]; ok {
		return time.Until(ttl), nil
	}
	return 0, ErrNoSuchItem
}

func (s *memStore) Reset() {
	s.mu.Lock()
	defer s.mu.Unlock()

	s.values = nil
	s.ttl = nil
}
