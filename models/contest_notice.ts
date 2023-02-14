import * as TypeORM from "typeorm";
import Model from "./common";

import User from "./user";

declare var syzoj: any;

@TypeORM.Entity()
export default class ContestNotice extends Model {
  static cache = false;

  @TypeORM.PrimaryGeneratedColumn()
  id: number;

  @TypeORM.Index()
  @TypeORM.Column({ nullable: true, type: "integer" })
  user_id: number;

  @TypeORM.Index()
  @TypeORM.Column({ nullable: true, type: "integer" })
  contest_id: number;

  @TypeORM.Column({ nullable: true, type: "integer" })
  time: number;

  @TypeORM.Column({ nullable: true, type: "varchar", length: 80 })
  title: string;

  @TypeORM.Column({ nullable: true, type: "mediumtext" })
  content: string;

  user?: User;

  async loadRelationships() {
    this.user = await User.findById(this.user_id);
  }

  async isAllowedEditBy(user) {
    return user && (user.is_admin || this.user_id === user.id);
  }
};
