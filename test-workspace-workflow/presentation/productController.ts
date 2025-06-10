import { ProductService } from '../application/productService';

export class ProductController {
  constructor(
    private readonly productService: ProductService,
  ) {}
}
