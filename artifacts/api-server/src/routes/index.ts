import { Router, type IRouter } from "express";
import healthRouter from "./health";
import bedwarsRouter from "./bedwars";
import minigameRouter from "./minigame";

const router: IRouter = Router();

router.use(healthRouter);
router.use(bedwarsRouter);
router.use(minigameRouter);

export default router;
