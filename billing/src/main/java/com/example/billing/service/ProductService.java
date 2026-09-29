package com.example.billing.service;

import com.example.billing.dto.ProductRequest;
import com.example.billing.entity.Product;
import com.example.billing.exception.ProductNotFoundException;
import com.example.billing.repository.ProductRepository;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class ProductService {

    private final ProductRepository productRepository;

    public ProductService(ProductRepository productRepository) {
        this.productRepository = productRepository;
    }

    public Product addProduct(ProductRequest request) {
        Product product = new Product();

        product.setName(request.getName());
        product.setPrice(request.getPrice());
        product.setStockQuantity(request.getStockQuantity());
        product.setReorderThreshold(request.getReorderThreshold());

        return productRepository.save(product);
    }

    public List<Product> getAllProducts() {
        return productRepository.findAll();
    }

    public Product getProduct(Long id) {
        return productRepository.findById(id)
                .orElseThrow(() -> new ProductNotFoundException(id));
    }

    public Product updateProduct(Long id, ProductRequest request) {

        Product product = getProduct(id);

        product.setName(request.getName());
        product.setPrice(request.getPrice());
        product.setStockQuantity(request.getStockQuantity());
        product.setReorderThreshold(request.getReorderThreshold());

        return productRepository.save(product);
    }

    public void deleteProduct(Long id) {

        Product product = getProduct(id);

        productRepository.delete(product);
    }

    public List<Product> getLowStockProducts() {

        return productRepository.findAll()
                .stream()
                .filter(product ->
                        product.getStockQuantity()
                                <= product.getReorderThreshold())
                .toList();
    }

    public List<Product> searchProducts(String name) {

        return productRepository
                .findByNameContainingIgnoreCase(name);
    }
}