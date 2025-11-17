"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.routes = void 0;
const express_1 = require("express");
const userController_1 = require("../controllers/userController");
const cosmeticsController_1 = require("../controllers/cosmeticsController");
const inventoryController_1 = require("../controllers/inventoryController");
const authController_1 = require("../controllers/authController");
const router = (0, express_1.Router)();
/* Auth */
router.post('/auth/register', authController_1.authController.register);
router.post('/auth/login', authController_1.authController.login);
/* Users */
router.get('/users', userController_1.userController.list);
router.post('/users', userController_1.userController.create);
router.put('/users/:id', userController_1.userController.update);
router.delete('/users/:id', userController_1.userController.remove);
router.post('/users/:id/reset-password', userController_1.userController.resetPassword);
router.post('/users/change-password', userController_1.userController.changePassword);
router.get('/users/:id', userController_1.userController.get);
/* Public profiles */
router.get('/public/users', userController_1.userController.publicList);
router.get('/public/users/:id', userController_1.userController.publicProfile);
/* Cosmetics */
router.get('/users/:userId/cosmeticos', cosmeticsController_1.cosmeticsController.list);
router.post('/users/:userId/cosmeticos', cosmeticsController_1.cosmeticsController.create);
router.put('/users/:userId/cosmeticos/:cosmeticId', cosmeticsController_1.cosmeticsController.update);
router.delete('/users/:userId/cosmeticos/:cosmeticId', cosmeticsController_1.cosmeticsController.remove);
/* Inventory */
router.get('/users/:userId/inventory', inventoryController_1.inventoryController.list);
router.get('/users/:userId/history', inventoryController_1.inventoryController.history);
router.post('/users/:userId/purchase', inventoryController_1.inventoryController.purchase);
router.post('/users/:userId/cosmeticos/:cosmeticId/refund', inventoryController_1.inventoryController.refund);
exports.routes = router;
exports.default = router;
