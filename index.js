import { add } from "./add.js";
import { initRepository } from "./initRepo.js";


initRepository(process.cwd());

add(process.cwd(), process.argv.slice(2));
