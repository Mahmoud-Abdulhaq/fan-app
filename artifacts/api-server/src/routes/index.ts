import { Router, type IRouter } from "express";
import healthRouter from "./health";
import bedwarsRouter from "./bedwars";

const router: IRouter = Router();

router.use(healthRouter);
router.use(bedwarsRouter);

export default router;
