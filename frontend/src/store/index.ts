import { ImageStore } from './imageStore';
import { UserStore } from './userStore';

class RootStore {
  userStore: UserStore;
  imageStore: ImageStore;

  constructor() {
    this.userStore = new UserStore();
    this.imageStore = new ImageStore(this.userStore);
  }
}

export const rootStore = new RootStore();
export const userStore = rootStore.userStore;
export const imageStore = rootStore.imageStore;


