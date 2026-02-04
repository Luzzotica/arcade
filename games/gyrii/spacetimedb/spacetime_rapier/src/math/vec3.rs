//! 3D Vector type

use spacetimedb::SpacetimeType;
use std::ops::{Add, AddAssign, Div, DivAssign, Mul, MulAssign, Neg, Sub, SubAssign};

/// A 3D vector
#[derive(SpacetimeType, Clone, Copy, Debug, Default, PartialEq)]
pub struct Vec3 {
    pub x: f32,
    pub y: f32,
    pub z: f32,
}

impl Vec3 {
    /// Zero vector
    pub const ZERO: Self = Self { x: 0.0, y: 0.0, z: 0.0 };
    /// Unit vector pointing right (positive X)
    pub const X: Self = Self { x: 1.0, y: 0.0, z: 0.0 };
    /// Unit vector pointing up (positive Y)
    pub const Y: Self = Self { x: 0.0, y: 1.0, z: 0.0 };
    /// Unit vector pointing forward (positive Z)
    pub const Z: Self = Self { x: 0.0, y: 0.0, z: 1.0 };
    /// All ones
    pub const ONE: Self = Self { x: 1.0, y: 1.0, z: 1.0 };

    /// Create a new 3D vector
    #[inline]
    pub const fn new(x: f32, y: f32, z: f32) -> Self {
        Self { x, y, z }
    }

    /// Create from a single value (all components)
    #[inline]
    pub const fn splat(v: f32) -> Self {
        Self { x: v, y: v, z: v }
    }

    /// Dot product
    #[inline]
    pub fn dot(self, other: Self) -> f32 {
        self.x * other.x + self.y * other.y + self.z * other.z
    }

    /// Cross product
    #[inline]
    pub fn cross(self, other: Self) -> Self {
        Self::new(
            self.y * other.z - self.z * other.y,
            self.z * other.x - self.x * other.z,
            self.x * other.y - self.y * other.x,
        )
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

    /// Component-wise min
    #[inline]
    pub fn min(self, other: Self) -> Self {
        Self::new(
            self.x.min(other.x),
            self.y.min(other.y),
            self.z.min(other.z),
        )
    }

    /// Component-wise max
    #[inline]
    pub fn max(self, other: Self) -> Self {
        Self::new(
            self.x.max(other.x),
            self.y.max(other.y),
            self.z.max(other.z),
        )
    }

    /// Component-wise clamp
    #[inline]
    pub fn clamp(self, min: Self, max: Self) -> Self {
        self.max(min).min(max)
    }

    /// Component-wise absolute value
    #[inline]
    pub fn abs(self) -> Self {
        Self::new(self.x.abs(), self.y.abs(), self.z.abs())
    }

    /// Get XY components as Vec2
    #[inline]
    pub fn xy(self) -> super::Vec2 {
        super::Vec2::new(self.x, self.y)
    }

    /// Get XZ components as Vec2
    #[inline]
    pub fn xz(self) -> super::Vec2 {
        super::Vec2::new(self.x, self.z)
    }

    /// Reflect this vector around a normal
    #[inline]
    pub fn reflect(self, normal: Self) -> Self {
        self - normal * 2.0 * self.dot(normal)
    }

    /// Project this vector onto another
    #[inline]
    pub fn project_onto(self, other: Self) -> Self {
        let dot = self.dot(other);
        let len_sq = other.length_squared();
        if len_sq > 1e-6 {
            other * (dot / len_sq)
        } else {
            Self::ZERO
        }
    }
}

// Conversion to/from Rapier3D/nalgebra types
#[cfg(feature = "dim3")]
impl From<Vec3> for nalgebra::Vector3<f32> {
    fn from(v: Vec3) -> Self {
        nalgebra::Vector3::new(v.x, v.y, v.z)
    }
}

#[cfg(feature = "dim3")]
impl From<nalgebra::Vector3<f32>> for Vec3 {
    fn from(v: nalgebra::Vector3<f32>) -> Self {
        Self::new(v.x, v.y, v.z)
    }
}

#[cfg(feature = "dim3")]
impl From<Vec3> for nalgebra::Point3<f32> {
    fn from(v: Vec3) -> Self {
        nalgebra::Point3::new(v.x, v.y, v.z)
    }
}

#[cfg(feature = "dim3")]
impl From<nalgebra::Point3<f32>> for Vec3 {
    fn from(p: nalgebra::Point3<f32>) -> Self {
        Self::new(p.x, p.y, p.z)
    }
}

// Operator implementations
impl Add for Vec3 {
    type Output = Self;
    #[inline]
    fn add(self, rhs: Self) -> Self {
        Self::new(self.x + rhs.x, self.y + rhs.y, self.z + rhs.z)
    }
}

impl AddAssign for Vec3 {
    #[inline]
    fn add_assign(&mut self, rhs: Self) {
        self.x += rhs.x;
        self.y += rhs.y;
        self.z += rhs.z;
    }
}

impl Sub for Vec3 {
    type Output = Self;
    #[inline]
    fn sub(self, rhs: Self) -> Self {
        Self::new(self.x - rhs.x, self.y - rhs.y, self.z - rhs.z)
    }
}

impl SubAssign for Vec3 {
    #[inline]
    fn sub_assign(&mut self, rhs: Self) {
        self.x -= rhs.x;
        self.y -= rhs.y;
        self.z -= rhs.z;
    }
}

impl Mul<f32> for Vec3 {
    type Output = Self;
    #[inline]
    fn mul(self, rhs: f32) -> Self {
        Self::new(self.x * rhs, self.y * rhs, self.z * rhs)
    }
}

impl Mul<Vec3> for f32 {
    type Output = Vec3;
    #[inline]
    fn mul(self, rhs: Vec3) -> Vec3 {
        Vec3::new(self * rhs.x, self * rhs.y, self * rhs.z)
    }
}

impl MulAssign<f32> for Vec3 {
    #[inline]
    fn mul_assign(&mut self, rhs: f32) {
        self.x *= rhs;
        self.y *= rhs;
        self.z *= rhs;
    }
}

impl Div<f32> for Vec3 {
    type Output = Self;
    #[inline]
    fn div(self, rhs: f32) -> Self {
        Self::new(self.x / rhs, self.y / rhs, self.z / rhs)
    }
}

impl DivAssign<f32> for Vec3 {
    #[inline]
    fn div_assign(&mut self, rhs: f32) {
        self.x /= rhs;
        self.y /= rhs;
        self.z /= rhs;
    }
}

impl Neg for Vec3 {
    type Output = Self;
    #[inline]
    fn neg(self) -> Self {
        Self::new(-self.x, -self.y, -self.z)
    }
}
