use serde::{Deserialize, Serialize};
use std::cmp::Ordering;
use std::fmt;
use std::ops::{Add, AddAssign, Div, DivAssign, Mul, MulAssign, Rem, RemAssign, Sub, SubAssign};

#[cfg(feature = "bindings")]
use typescript_definitions::TypescriptDefinition;

#[allow(unused_imports)]
#[cfg(feature = "bindings")]
use wasm_bindgen::prelude::*;

pub const MAX: u8 = 99;
/* == Saturating U8 ==
*  Values like health, cost, and attack
*  should never overflow above MAX,
*  and should never go below 0.
*  This is probably much slower than native integers,
*  but I can't see a good way of bounds checking
*  without something like this.
*/
#[cfg_attr(feature = "bindings", derive(TypescriptDefinition))]
#[derive(Deserialize, Serialize, Clone, Copy, Debug, PartialEq, Eq, PartialOrd, Ord, Hash)]
pub struct SaturatingU8(u8);

impl SaturatingU8 {
  fn new(num: u8) -> Self {
    Self(std::cmp::min(num, MAX))
  }
}

impl fmt::Display for SaturatingU8 {
  fn fmt(&self, f: &mut fmt::Formatter) -> fmt::Result {
    self.0.fmt(f)
  }
}

impl Default for SaturatingU8 {
  fn default() -> Self {
    Self(0)
  }
}

impl Add<SaturatingU8> for SaturatingU8 {
  type Output = Self;
  fn add(self, other: SaturatingU8) -> Self {
    Self::new(self.0.saturating_add(other.0))
  }
}
impl Sub<SaturatingU8> for SaturatingU8 {
  type Output = Self;
  fn sub(self, other: SaturatingU8) -> Self {
    Self::new(self.0.saturating_sub(other.0))
  }
}
impl Mul<SaturatingU8> for SaturatingU8 {
  type Output = Self;
  fn mul(self, other: SaturatingU8) -> Self {
    Self::new(self.0.saturating_mul(other.0))
  }
}
impl Div<SaturatingU8> for SaturatingU8 {
  type Output = Self;
  fn div(self, other: SaturatingU8) -> Self {
    Self::new(self.0 / other.0)
  }
}
impl Rem<SaturatingU8> for SaturatingU8 {
  type Output = Self;
  fn rem(self, other: SaturatingU8) -> Self {
    Self::new(self.0 % other.0)
  }
}
impl AddAssign<SaturatingU8> for SaturatingU8 {
  fn add_assign(&mut self, other: SaturatingU8) {
    *self = *self + other;
  }
}
impl SubAssign<SaturatingU8> for SaturatingU8 {
  fn sub_assign(&mut self, other: SaturatingU8) {
    *self = *self - other;
  }
}
impl MulAssign<SaturatingU8> for SaturatingU8 {
  fn mul_assign(&mut self, other: SaturatingU8) {
    *self = *self * other;
  }
}
impl DivAssign<SaturatingU8> for SaturatingU8 {
  fn div_assign(&mut self, other: SaturatingU8) {
    *self = *self / other;
  }
}
impl RemAssign<SaturatingU8> for SaturatingU8 {
  fn rem_assign(&mut self, other: SaturatingU8) {
    *self = *self % other;
  }
}

impl Add<i8> for SaturatingU8 {
  type Output = Self;

  fn add(self, other: i8) -> Self {
    #[allow(clippy::cast_lossless)]
    Self::new(if other > MAX as i8 {
      MAX
    } else if other < 0 {
      if other < -(MAX as i8) {
        0
      } else {
        self.0.saturating_sub(other.unsigned_abs())
      }
    } else {
      self.0.saturating_add(other as u8)
    })
  }
}

impl Sub<i8> for SaturatingU8 {
  type Output = Self;

  fn sub(self, other: i8) -> Self {
    #[allow(clippy::cast_lossless)]
    Self::new(if other > (MAX as i8) {
      0
    } else if other < 0 {
      if other < -(MAX as i8) {
        MAX
      } else {
        self.0.saturating_add(other as u8)
      }
    } else {
      self.0.saturating_sub(other as u8)
    })
  }
}

impl From<SaturatingU8> for i8 {
  fn from(val: SaturatingU8) -> i8 {
    if val.0 > std::i8::MAX as u8 {
      std::i8::MAX
    } else {
      val.0 as i8
    }
  }
}

impl From<i8> for SaturatingU8 {
  fn from(num: i8) -> Self {
    Self::new(if num < 0 { 0 } else { num as u8 })
  }
}

macro_rules! signed_impls {
    ($($t:ty)*) => ($(
        impl Add<$t> for SaturatingU8 {
            type Output = Self;

            fn add(self, other: $t) -> Self {
                #[allow(clippy::cast_lossless)]
                Self::new(
                    if other > MAX as $t {
                        MAX
                    } else if other < 0 {
                        if other < -(MAX as $t) {
                            0
                        } else {
                            self.0.saturating_sub(other.abs() as u8)
                        }
                    } else {
                        self.0.saturating_add(other as u8)
                    }
                )
            }
        }


        impl Sub<$t> for SaturatingU8 {
            type Output = Self;

            fn sub(self, other: $t) -> Self {
                #[allow(clippy::cast_lossless)]
                Self::new(
                    if other > (MAX as $t) {
                        0
                    } else if other < 0 {
                        if other < -(MAX as $t) {
                            MAX
                        } else {
                            self.0.saturating_add(other as u8)
                        }
                    } else {
                        self.0.saturating_sub(other as u8)
                    }
                )
            }
        }

        impl From<SaturatingU8> for $t {
            fn from(val: SaturatingU8) -> $t {
                <$t>::from(val.0)
            }
        }

        impl From<$t> for SaturatingU8 {
          fn from(num: $t) -> Self {
            Self::new(
              if num > MAX.into() {MAX} else if num < 0 { 0 } else {num as u8}
            )
          }
        }
    )*)
}

macro_rules! unsigned_impls {
    ($($t:ty)*) => ($(
        impl Add<$t> for SaturatingU8 {
            type Output = Self;

            fn add(self, other: $t) -> Self {
                #[allow(clippy::cast_lossless)]
                Self::new(
                    self.0.saturating_add(if other > MAX.into() {MAX} else {other as u8})
                )
            }
        }


        impl Sub<$t> for SaturatingU8 {
            type Output = Self;

            fn sub(self, other: $t) -> Self {
                #[allow(clippy::cast_lossless)]
                Self::new(
                    self.0.saturating_sub(if other > MAX.into() {MAX} else {other as u8})
                )
            }
        }

        impl Mul<$t> for SaturatingU8 {
            type Output = Self;

            fn mul(self, other: $t) -> Self {
                #[allow(clippy::cast_lossless)]
                Self::new(
                    self.0.saturating_mul(if other > MAX.into() {MAX} else {other as u8})
                )
            }
        }

        impl Div<$t> for SaturatingU8 {
            type Output = Self;

            fn div(self, other: $t) -> Self {
                #[allow(clippy::cast_lossless)]
                Self::new(
                    self.0 / if other > MAX.into() {MAX} else {other as u8}
                )
            }
        }

        impl MulAssign<$t> for SaturatingU8 {
            fn mul_assign(&mut self, other: $t) {
                *self = *self * other;
            }
        }

        impl DivAssign<$t> for SaturatingU8 {
            fn div_assign(&mut self, other: $t) {
                *self = *self / other;
            }
        }

        impl From<SaturatingU8> for $t {
            fn from(val: SaturatingU8) -> $t {
                <$t>::from(val.0)
            }
        }

        impl From<$t> for SaturatingU8 {
          fn from(num: $t) -> Self {
            Self::new(
              if num > MAX.into() {MAX} else {num as u8}
            )
          }
        }
    )*)
}

macro_rules! math_impls {
    ($($t:ty)*) => ($(
        impl AddAssign<$t> for SaturatingU8 {
            fn add_assign(&mut self, other: $t) {
                *self = *self + other;
            }
        }

        impl SubAssign<$t> for SaturatingU8 {
            fn sub_assign(&mut self, other: $t) {
                *self = *self - other;
            }
        }

        impl PartialEq<$t> for SaturatingU8 {
            #[allow(clippy::cast_lossless, unused_comparisons)]
            fn eq(&self, other: &$t) -> bool {
                if *other < 0 || *other > MAX as $t {
                    false
                } else {
                    self.0 == (*other) as u8
                }
            }
        }

        impl PartialOrd<$t> for SaturatingU8 {
            #[allow(clippy::cast_lossless)]
            fn partial_cmp(&self, other: &$t) -> Option<Ordering> {
                self.0.partial_cmp(&(*other as u8))
            }
        }
    )*)
}

signed_impls! { i16 i32 i64 }
unsigned_impls! { u8 u16 u32 u64 usize }
math_impls! { i8 i16 i32 i64 u8 u16 u32 u64 usize }

#[cfg(test)]
mod test {
  use super::*;

  #[test]
  fn saturating_u8_works() {
    let mut foo: SaturatingU8 = 100.into();
    foo -= 1000000;
    assert_eq!(foo, 0);
    foo += 1000000;
    assert_eq!(foo, MAX);
    foo += -1000000;
    assert_eq!(foo, 0);
    foo -= -1000000;
    assert_eq!(foo, MAX);
    foo = MAX.into();
    foo -= 1;
    assert_eq!(foo, MAX - 1);
    foo = 5.into();
    foo -= 4i32;
    assert_eq!(foo, 1);
  }

  #[test]
  fn saturating_u8_saturates_at_0() {
    let mut foo: SaturatingU8 = 1.into();
    let bar: SaturatingU8 = 100.into();
    foo -= bar;
    assert_eq!(foo, 0);
  }

  #[test]
  fn saturating_u8_saturates_at_max() {
    let mut foo: SaturatingU8 = 1.into();
    let bar: SaturatingU8 = MAX.into();
    foo += bar;
    assert_eq!(foo, MAX);
  }

  #[test]
  fn serializes_and_deserializes() {
    let foo: SaturatingU8 = 42.into();
    let serialized_foo = serde_cbor::to_vec(&foo).unwrap();
    let deserialized_foo = serde_cbor::from_slice::<SaturatingU8>(&serialized_foo).unwrap();
    assert_eq!(foo, deserialized_foo);
    assert_eq!(
      serialized_foo,
      serde_cbor::to_vec(&deserialized_foo).unwrap()
    );
  }
}
