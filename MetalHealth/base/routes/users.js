const express = require("express")
const User = require("../models/User")
const { authenticateToken } = require("../middleware/auth")
const { getDatabase } = require("../config/database") // Updated to use new database import

const router = express.Router()

// Get all users (protected route)
router.get("/", authenticateToken, async (req, res) => {
  try {
    // This would typically be admin-only
    const db = await getDatabase() // Get database instance
    const [users] = await db.query("SELECT user_id, name, phoneno, age, email FROM Users")
    res.json({ users })
  } catch (error) {
    console.error("Get users error:", error)
    res.status(500).json({ message: "Internal server error" })
  }
})

// Get user by ID
router.get("/:id", authenticateToken, async (req, res) => {
  try {
    const userId = req.params.id

    // Users can only access their own data unless admin
    if (req.user.user_id !== Number.parseInt(userId)) {
      return res.status(403).json({ message: "Access denied" })
    }

    const user = await User.findById(userId)
    if (!user) {
      return res.status(404).json({ message: "User not found" })
    }

    res.json({ user })
  } catch (error) {
    console.error("Get user error:", error)
    res.status(500).json({ message: "Internal server error" })
  }
})

// Update user profile
router.put("/:id", authenticateToken, async (req, res) => {
  try {
    const userId = req.params.id
    const { name, email, phoneno, age, gender } = req.body

    // Users can only update their own data
    if (req.user.user_id !== Number.parseInt(userId)) {
      return res.status(403).json({ message: "Access denied" })
    }

    // Validate required fields
    if (!name || !email || !phoneno || !age || !gender) {
      return res.status(400).json({ 
        message: "All required fields must be provided",
        required: ["name", "email", "phoneno", "age", "gender"]
      })
    }

    // Validate age
    const ageNum = Number.parseInt(age)
    if (isNaN(ageNum) || ageNum <= 0) {
      return res.status(400).json({ message: "Age must be a positive number" })
    }

    // Validate email format (basic validation)
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return res.status(400).json({ message: "Invalid email format" })
    }

    // Check if email or phone is already taken by another user
    const db = await getDatabase()
    const [emailCheck] = await db.query(
      "SELECT user_id FROM Users WHERE email = ? AND user_id != ?",
      [email, userId]
    )
    if (emailCheck.length > 0) {
      return res.status(409).json({ message: "Email already exists" })
    }

    const [phoneCheck] = await db.query(
      "SELECT user_id FROM Users WHERE phoneno = ? AND user_id != ?",
      [phoneno, userId]
    )
    if (phoneCheck.length > 0) {
      return res.status(409).json({ message: "Phone number already exists" })
    }

    // Update user data using parameterized queries (only editable fields)
    // Excluded: password, instagram_token, created_at, updated_at
    await db.query(
      "UPDATE Users SET name = ?, email = ?, phoneno = ?, age = ?, gender = ? WHERE user_id = ?",
      [name.trim(), email.trim(), phoneno.trim(), ageNum, gender, userId]
    )

    // Get updated user data
    const updatedUser = await User.findById(userId)
    if (!updatedUser) {
      return res.status(404).json({ message: "User not found after update" })
    }

    // Map user_id to id for frontend consistency
    res.json({
      message: "Profile updated successfully",
      user: {
        id: updatedUser.user_id,
        name: updatedUser.name,
        email: updatedUser.email,
        phoneno: updatedUser.phoneno,
        age: updatedUser.age,
        gender: updatedUser.gender,
        instagram_token: updatedUser.instagram_token,
      },
    })
  } catch (error) {
    console.error("Update user error:", error)
    if (error.code === "ER_DUP_ENTRY") {
      if (error.sqlMessage.includes("email")) {
        return res.status(409).json({ message: "Email already exists" })
      } else if (error.sqlMessage.includes("phoneno")) {
        return res.status(409).json({ message: "Phone number already exists" })
      }
      return res.status(409).json({ message: "Duplicate entry. Email or phone number already exists" })
    }
    res.status(500).json({ message: "Internal server error" })
  }
})

module.exports = router
