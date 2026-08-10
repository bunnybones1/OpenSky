package analytics

import (
	"fmt"

	"github.com/horizon-games/OpenSky/api/proto"
)

type Props struct {
	Values map[string]interface{}
	Device map[string]string
}

func NewProps() Props {
	return Props{
		Values: make(map[string]interface{}, 10),
		Device: map[string]string{},
	}
}

func (p Props) Set(name string, v interface{}) Props {
	p.Values[name] = v
	return p
}

func (p Props) SetJSON(name string, v []byte) Props {
	return p.Set(name, string(v))
}

func (p Props) SetString(name string, s string) Props {
	return p.Set(name, s)
}

func (p Props) SetStringer(name string, s fmt.Stringer) Props {
	return p.Set(name, s.String())
}

func (p Props) SetNumeric(name string, v interface{}) Props {
	return p.Set(name, v)
}

func (p Props) SetInteger(name string, v interface{}) Props {
	switch t := v.(type) {
	case float64:
		return p.Set(name, int64(t))
	case float32:
		return p.Set(name, int64(t))
	}
	return p.Set(name, v)
}

func (p Props) SetBool(name string, b bool) Props {
	return p.Set(name, b)
}

func (p Props) SetDevice(device *proto.DeviceProperties) Props {
	if device == nil {
		return p
	}

	if device.DeviceID != nil {
		p.Device["deviceID"] = *device.DeviceID
	}

	if device.CountryCode != nil {
		p.Device["countryCode"] = *device.CountryCode
	}

	if device.EnvironmentDevice != nil {
		p.Device["environmentDevice"] = *device.EnvironmentDevice
	}

	if device.EnvironmentOS != nil {
		p.Device["environmentOS"] = *device.EnvironmentOS
	}

	if device.EnvironmentProduct != nil {
		p.Device["environmentProduct"] = *device.EnvironmentProduct
	}

	return p
}

func (p Props) SetAccount(account *proto.Account) Props {
	if account == nil {
		return p
	}
	p.SetStringer("accountAddress", account.Address)
	p.SetString("username", account.Name)
	return p
}
