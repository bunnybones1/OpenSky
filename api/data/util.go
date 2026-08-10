package data

import "sort"

type UInt64Slice []uint64

func (p UInt64Slice) Len() int { return len(p) }

func (p UInt64Slice) Less(i, j int) bool { return p[i] < p[j] }

func (p UInt64Slice) Swap(i, j int) { p[i], p[j] = p[j], p[i] }

func (p UInt64Slice) Sort() { sort.Sort(p) }

func SortUInt64Slice(slice []uint64) {
	sort.Sort(UInt64Slice(slice))
}

func SetUIntPointer(v uint) *uint {
	i := v
	return &i
}
