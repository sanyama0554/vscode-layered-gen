import { OrderService } from '../application/orderService';

export class OrderController {
  constructor(
    private readonly orderService: OrderService,
  ) {}
}
