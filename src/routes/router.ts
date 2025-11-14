import { Router } from 'express'
import { userController } from '../controllers/userController'
import { cosmeticsController } from '../controllers/cosmeticsController'
import { inventoryController } from '../controllers/inventoryController'
import { authController } from '../controllers/authController'

const router = Router()

/* Auth */
router.post('/auth/register', authController.register)
router.post('/auth/login', authController.login)

/* Users */
router.get('/users', userController.list)
router.post('/users', userController.create)
router.put('/users/:id', userController.update)
router.delete('/users/:id', userController.remove)
router.post('/users/:id/reset-password', userController.resetPassword)
router.post('/users/change-password', userController.changePassword)
router.get('/users/:id', userController.get)

/* Public profiles */
router.get('/public/users', userController.publicList)
router.get('/public/users/:id', userController.publicProfile)

/* Cosmetics */
router.get('/users/:userId/cosmeticos', cosmeticsController.list)
router.post('/users/:userId/cosmeticos', cosmeticsController.create)
router.put('/users/:userId/cosmeticos/:cosmeticId', cosmeticsController.update)
router.delete('/users/:userId/cosmeticos/:cosmeticId', cosmeticsController.remove)

/* Inventory */
router.get('/users/:userId/inventory', inventoryController.list)
router.get('/users/:userId/history', inventoryController.history)
router.post('/users/:userId/purchase', inventoryController.purchase)
router.post('/users/:userId/cosmeticos/:cosmeticId/refund', inventoryController.refund)

export const routes = router
export default router
