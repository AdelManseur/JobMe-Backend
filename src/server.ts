import config from './config/config';
import connectDB from './lib/db';
import { server } from './app';



server.listen(config.port, () => {
  console.log(`Server running on port ${config.port}`);
  connectDB();
});