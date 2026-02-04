//! Quaternion type for 3D rotations

use spacetimedb::SpacetimeType;
use std::ops::{Mul, MulAssign, Neg};
use super::Vec3;

/// A quaternion representing a 3D rotation
#[derive(SpacetimeType, Clone, Copy, Debug, PartialEq)]
pub struct Quat {
    pub x: f32,
    pub y: f32,
    pub z: f32,
    pub w: f32,
}

impl Default for Quat {
    fn default() -> Self {
        Self::IDENTITY
    }
}

impl Quat {
    /// Identity quaternion (no rotation)
    pub const IDENTITY: Self = Self { x: 0.0, y: 0.0, z: 0.0, w: 1.0 };

    /// Create a new quaternion
    #[inline]
    pub const fn new(x: f32, y: f32, z: f32, w: f32) -> Self {
        Self { x, y, z, w }
    }

    /// Create from axis and angle (in radians)
    #[inline]
    pub fn from_axis_angle(axis: Vec3, angle: f32) -> Self {
        let half_angle = angle * 0.5;
        let s = half_angle.sin();
        let axis = axis.normalize();
        Self::new(axis.x * s, axis.y * s, axis.z * s, half_angle.cos())
    }

    /// Create from rotation around X axis (in radians)
    #[inline]
    pub fn from_rotation_x(angle: f32) -> Self {
        Self::from_axis_angle(Vec3::X, angle)
    }

    /// Create from rotation around Y axis (in radians)
    #[inline]
    pub fn from_rotation_y(angle: f32) -> Self {
        Self::from_axis_angle(Vec3::Y, angle)
    }

    /// Create from rotation around Z axis (in radians)
    #[inline]
    pub fn from_rotation_z(angle: f32) -> Self {
        Self::from_axis_angle(Vec3::Z, angle)
    }

    /// Create from Euler angles (XYZ order, in radians)
    #[inline]
    pub fn from_euler(x: f32, y: f32, z: f32) -> Self {
        Self::from_rotation_x(x) * Self::from_rotation_y(y) * Self::from_rotation_z(z)
    }

    /// Squared length
    #[inline]
    pub fn length_squared(self) -> f32 {
        self.x * self.x + self.y * self.y + self.z * self.z + self.w * self.w
    }

    /// Length
    #[inline]
    pub fn length(self) -> f32 {
        self.length_squared().sqrt()
    }

    /// Normalize the quaternion
    #[inline]
    pub fn normalize(self) -> Self {
        let len = self.length();
        if len > 0.0 {
            Self::new(self.x / len, self.y / len, self.z / len, self.w / len)
        } else {
            Self::IDENTITY
        }
    }

    /// Conjugate (inverse for unit quaternions)
    #[inline]
    pub fn conjugate(self) -> Self {
        Self::new(-self.x, -self.y, -self.z, self.w)
    }

    /// Inverse (assumes unit quaternion)
    #[inline]
    pub fn inverse(self) -> Self {
        self.conjugate()
    }

    /// Dot product
    #[inline]
    pub fn dot(self, other: Self) -> f32 {
        self.x * other.x + self.y * other.y + self.z * other.z + self.w * other.w
    }

    /// Rotate a vector by this quaternion
    #[inline]
    pub fn rotate_vec3(self, v: Vec3) -> Vec3 {
        let qv = Vec3::new(self.x, self.y, self.z);
        let uv = qv.cross(v);
        let uuv = qv.cross(uv);
        v + (uv * self.w + uuv) * 2.0
    }

    /// Spherical linear interpolation
    #[inline]
    pub fn slerp(self, other: Self, t: f32) -> Self {
        let mut dot = self.dot(other);
        let other = if dot < 0.0 {
            dot = -dot;
            -other
        } else {
            other
        };

        if dot > 0.9995 {
            // Linear interpolation for very similar quaternions
            return Self::new(
                self.x + t * (other.x - self.x),
                self.y + t * (other.y - self.y),
                self.z + t * (other.z - self.z),
                self.w + t * (other.w - self.w),
            ).normalize();
        }

        let theta = dot.acos();
        let sin_theta = theta.sin();
        let wa = ((1.0 - t) * theta).sin() / sin_theta;
        let wb = (t * theta).sin() / sin_theta;

        Self::new(
            self.x * wa + other.x * wb,
            self.y * wa + other.y * wb,
            self.z * wa + other.z * wb,
            self.w * wa + other.w * wb,
        )
    }

    /// Get the axis of rotation (assumes normalized)
    #[inline]
    pub fn axis(self) -> Vec3 {
        let s = (1.0 - self.w * self.w).sqrt();
        if s > 1e-6 {
            Vec3::new(self.x / s, self.y / s, self.z / s)
        } else {
            Vec3::Y // Arbitrary axis for zero rotation
        }
    }

    /// Get the angle of rotation (in radians)
    #[inline]
    pub fn angle(self) -> f32 {
        2.0 * self.w.acos()
    }

    /// Convert to Euler angles (XYZ order, in radians)
    pub fn to_euler(self) -> (f32, f32, f32) {
        let sinr_cosp = 2.0 * (self.w * self.x + self.y * self.z);
        let cosr_cosp = 1.0 - 2.0 * (self.x * self.x + self.y * self.y);
        let x = sinr_cosp.atan2(cosr_cosp);

        let sinp = 2.0 * (self.w * self.y - self.z * self.x);
        let y = if sinp.abs() >= 1.0 {
            std::f32::consts::FRAC_PI_2.copysign(sinp)
        } else {
            sinp.asin()
        };

        let siny_cosp = 2.0 * (self.w * self.z + self.x * self.y);
        let cosy_cosp = 1.0 - 2.0 * (self.y * self.y + self.z * self.z);
        let z = siny_cosp.atan2(cosy_cosp);

        (x, y, z)
    }

    /// Get the Z rotation angle (for 2D games)
    #[inline]
    pub fn to_angle_z(self) -> f32 {
        2.0 * self.z.atan2(self.w)
    }

    /// Create from Z rotation angle (for 2D games)
    #[inline]
    pub fn from_angle_z(angle: f32) -> Self {
        let half = angle * 0.5;
        Self::new(0.0, 0.0, half.sin(), half.cos())
    }

    /// Extract forward direction (negative Z)
    #[inline]
    pub fn forward(self) -> Vec3 {
        self.rotate_vec3(Vec3::new(0.0, 0.0, -1.0))
    }

    /// Extract right direction (positive X)
    #[inline]
    pub fn right(self) -> Vec3 {
        self.rotate_vec3(Vec3::X)
    }

    /// Extract up direction (positive Y)
    #[inline]
    pub fn up(self) -> Vec3 {
        self.rotate_vec3(Vec3::Y)
    }
}

// Conversion to/from Rapier3D/nalgebra types
#[cfg(feature = "dim3")]
impl From<Quat> for nalgebra::UnitQuaternion<f32> {
    fn from(q: Quat) -> Self {
        nalgebra::UnitQuaternion::from_quaternion(
            nalgebra::Quaternion::new(q.w, q.x, q.y, q.z)
        )
    }
}

#[cfg(feature = "dim3")]
impl From<nalgebra::UnitQuaternion<f32>> for Quat {
    fn from(r: nalgebra::UnitQuaternion<f32>) -> Self {
        let q = r.into_inner();
        Self::new(q.i, q.j, q.k, q.w)
    }
}

// Conversion for 2D (just angle via nalgebra)
#[cfg(feature = "dim2")]
impl From<Quat> for nalgebra::UnitComplex<f32> {
    fn from(q: Quat) -> Self {
        nalgebra::UnitComplex::new(q.to_angle_z())
    }
}

#[cfg(feature = "dim2")]
impl From<nalgebra::UnitComplex<f32>> for Quat {
    fn from(r: nalgebra::UnitComplex<f32>) -> Self {
        Self::from_angle_z(r.angle())
    }
}

// Operator implementations
impl Mul for Quat {
    type Output = Self;
    #[inline]
    fn mul(self, rhs: Self) -> Self {
        Self::new(
            self.w * rhs.x + self.x * rhs.w + self.y * rhs.z - self.z * rhs.y,
            self.w * rhs.y - self.x * rhs.z + self.y * rhs.w + self.z * rhs.x,
            self.w * rhs.z + self.x * rhs.y - self.y * rhs.x + self.z * rhs.w,
            self.w * rhs.w - self.x * rhs.x - self.y * rhs.y - self.z * rhs.z,
        )
    }
}

impl MulAssign for Quat {
    #[inline]
    fn mul_assign(&mut self, rhs: Self) {
        *self = *self * rhs;
    }
}

impl Mul<Vec3> for Quat {
    type Output = Vec3;
    #[inline]
    fn mul(self, rhs: Vec3) -> Vec3 {
        self.rotate_vec3(rhs)
    }
}

impl Neg for Quat {
    type Output = Self;
    #[inline]
    fn neg(self) -> Self {
        Self::new(-self.x, -self.y, -self.z, -self.w)
    }
}
