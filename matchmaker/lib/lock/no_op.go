package lock

type noOp struct {
}

func NewNoOp() *noOp {
	return &noOp{}
}

func (n noOp) Lock() error {
	return nil
}

func (n noOp) Unlock() (bool, error) {
	return true, nil
}
