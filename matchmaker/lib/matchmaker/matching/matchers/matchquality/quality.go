package matchquality

import "math"

func Quality(factors ...Factor) float64 {
	exponent := 0.0
	for i := range factors {
		exponent += factors[i].Exponent()
	}

	quality := 1.0
	for i := range factors {
		quality = quality * math.Pow(1+factors[i].Scaler()*factors[i].Value(), factors[i].Exponent())
	}

	return math.Pow(quality, 1.0/exponent)
}
