import { Router, type IRouter } from "express";
import ordersRouter from "./orders";
import financeRouter from "./finance";
import dashboardRouter from "./dashboard";
import catalogRouter from "./catalog";
import snippetsRouter from "./snippets";

const router: IRouter = Router();

router.use(ordersRouter);
router.use(financeRouter);
router.use(dashboardRouter);
router.use(catalogRouter);
router.use(snippetsRouter);

export default router;
