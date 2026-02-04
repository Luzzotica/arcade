//! 2D Vector type

use spacetimedb::SpacetimeType;
use std::ops::{Add, AddAssign, Div, DivAssign, Mul, MulAssign, Neg, Sub, SubAssign};

/// A 2D vector
#[derive(SpacetimeType, Clone, Copy, Debug, Default, PartialEq)]
pub struct Vec2 {
    pub x: f32,
    pub y: f32,
}

impl Vec2 {
    /// Zero vector
    pub const ZERO: Self = Self { x: 0.0, y: 0.0 };
    /// Unit vector pointing right
    pub const X: Self = Self { x: 1.0, y: 0.0 };
    /// Unit vector pointing up
    pub const Y: Self = Self { x: 0.0, y: 1.0 };
    /// All ones
    pub const ONE: Self = Self { x: 1.0, y: 1.0 };

    /// Create a new 2D vector
    #[inline]
    pub const fn new(x: f32, y: f32) -> Self {
        Self { x, y }
    }

    /// Create from a single value (both components)
    #[inline]
    pub const fn splat(v: f32) -> Self {
        Self { x: v, y: v }
    }

    /// Dot product
    #[inline]
    pub fn dot(self, other: Self) -> f32 {
        self.x * other.x + self.y * other.y
    }

    /// Cross product (returns scalar z-component)
    #[inline]
    pub fn cross(self, other: Self) -> f32 {
        self.x * other.y - self.y * other.x
    }

    /// Squared length (magnitude squared)
    #[inline]
    pub fn length_squared(self) -> f32 {
        self.dot(self)
    }

    /// Length (magnitude)
    #[inline]
    pub fn length(self) -> f32 {
        self.length_squared().sqrt()
    }

    /// Normalize (unit vector)
    #[inline]
    pub fn normalize(self) -> Self {
        let len = self.length();
        if len > 0.0 {
            self / len
        } else {
            Self::ZERO
        }
    }

    /// Normalize or zero if too small
    #[inline]
    pub fn normalize_or_zero(self) -> Self {
        let len = self.length();
        if len > 1e-6 {
            self / len
        } else {
            Self::ZERO
        }
    }

    /// Linear interpolation
    #[inline]
    pub fn lerp(self, other: Self, t: f32) -> Self {
        self + (other - self) * t
    }

    /// Distance to another point
    #[inline]
    pub fn distance(self, other: Self) -> f32 {
        (other - self).length()
    }

    /// Squared distance to another point
    #[inline]
    pub fn distance_squared(self, other: Self) -> f32 {
        (other - self).length_squared()
    }

    /// Rotate by an angle (in radians)
    #[inline]
    pub fn rotate(self, angle: f32) -> Self {
        let (sin, cos) = angle.sin_cos();
        Self::new(
            self.x * cos - self.y * sin,
            self.x * sin + self.y * cos,
        )
    }

    /// Perpendicular vector (rotated 90 degrees counter-clockwise)
    #[inline]
    pub fn perp(self) -> Self {
        Self::new(-self.y, self.x)
    }

    /// Angle from positive X axis (in radians)
    #[inline]
    pub fn angle(self) -> f32 {
        self.y.atan2(self.x)
    }

    /// Component-wise min
    #[inline]
    pub fn min(self, other: Self) -> Self {
        Self::new(self.x.min(other.x), self.y.min(other.y))
    }

    /// Component-wise max
    #[inline]
    pub fn max(self, other: Self) -> Self {
        Self::new(self.x.max(other.x), self.y.max(other.y))
    }

    /// Component-wise clamp
    #[inline]
    pub fn clamp(self, min: Self, max: Self) -> Self {
        self.max(min).min(max)
    }

    /// Component-wise absolute value
    #[inline]
    pub fn abs(self) -> Self {
        Self::new(self.x.abs(), self.y.abs())
    }

    /// Extend to Vec3 with z=0
    pub fn extend(self, z: f32) -> super::Vec3 {
        super::Vec3::new(self.x, self.y, z)
    }
}

// Conversion to/from Rapier2D/nalgebra types
#[cfg(feature = "dim2")]
impl From<Vec2> for nalgebra::Vector2<f32> {
    fn from(v: Vec2) -> Self {
        nalgebra::Vector2::new(v.x, v.y)
    }
}

#[cfg(feature = "dim2")]
impl From<nalgebra::Vector2<f32>> for Vec2 {
    fn from(v: nalgebra::Vector2<f32>) -> Self {
        Self::new(v.x, v.y)
    }
}

#[cfg(feature = "dim2")]
impl From<Vec2> for nalgebra::Point2<f32> {
    fn from(v: Vec2) -> Self {
        nalgebra::Point2::new(v.x, v.y)
    }
}

#[cfg(feature = "dim2")]
impl From<nalgebra::Point2<f32>> for Vec2 {
    fn from(p: nalgebra::Point2<f32>) -> Self {
        Self::new(p.x, p.y)
    }
}

// Operator implementations
impl Add for Vec2 {
    type Output = Self;
    #[inline]
    fn add(self, rhs: Self) -> Self {
        Self::new(self.x + rhs.x, self.y + rhs.y)
    }
}

impl AddAssign for Vec2 {
    #[inline]
    fn add_assign(&mut self, rhs: Self) {
        self.x += rhs.x;
        self.y += rhs.y;
    }
}

impl Sub for Vec2 {
    type Output = Self;
    #[inline]
    fn sub(self, rhs: Self) -> Self {
        Self::new(self.x - rhs.x, self.y - rhs.y)
    }
}

impl SubAssign for Vec2 {
    #[inline]
    fn sub_assign(&mut self, rhs: Self) {
        self.x -= rhs.x;
        self.y -= rhs.y;
    }
}

impl Mul<f32> for Vec2 {
    type Output = Self;
    #[inline]
    fn mul(self, rhs: f32) -> Self {
        Self::new(self.x * rhs, self.y * rhs)
    }
}

impl Mul<Vec2> for f32 {
    type Output = Vec2;
    #[inline]
    fn mul(self, rhs: Vec2) -> Vec2 {
        Vec2::new(self * rhs.x, self * rhs.y)
    }
}

impl MulAssign<f32> for Vec2 {
    #[inline]
    fn mul_assign(&mut self, rhs: f32) {
        self.x *= rhs;
        self.y *= rhs;
    }
}

impl Div<f32> for Vec2 {
    type Output = Self;
    #[inline]
    fn div(self, rhs: f32) -> Self {
        Self::new(self.x / rhs, self.y / rhs)
    }
}

impl DivAssign<f32> for Vec2 {
    #[inline]
    fn div_assign(&mut self, rhs: f32) {
        self.x /= rhs;
        self.y /= rhs;
    }
}

impl Neg for Vec2 {
    type Output = Self;
    #[inline]
    fn neg(self) -> Self {
        Self::new(-self.x, -self.y)
    }
}
