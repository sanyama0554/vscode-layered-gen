import { Resolver, Query, Mutation, Args } from '@nestjs/graphql';
import { UserService } from './user.service';

@Resolver()
export class UserResolver {
  constructor(private readonly userService: UserService) {}

  @Query('getUser')
  async getUser(@Args('id') id: string) {
    return this.userService.findOne(id);
  }

  @Query('listUsers')
  async listUsers(@Args('limit') limit: number, @Args('offset') offset?: number) {
    return this.userService.findAll(limit, offset);
  }

  @Mutation('createUser')
  async createUser(@Args('input') input: any) {
    return this.userService.create(input);
  }

  @Mutation('updateUser')
  async updateUser(@Args('id') id: string, @Args('input') input: any) {
    return this.userService.update(id, input);
  }

  @Mutation('deleteUser')
  async deleteUser(@Args('id') id: string) {
    return this.userService.remove(id);
  }
}