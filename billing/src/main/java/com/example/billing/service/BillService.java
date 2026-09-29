package com.example.billing.service;

import com.example.billing.dto.BillItemRequest;
import com.example.billing.dto.BillRequest;
import com.example.billing.entity.Bill;
import com.example.billing.entity.BillItem;
import com.example.billing.entity.BillStatus;
import com.example.billing.entity.Product;
import com.example.billing.exception.InsufficientStockException;
import com.example.billing.exception.InvalidBillException;
import com.example.billing.exception.ProductNotFoundException;
import com.example.billing.repository.BillRepository;
import com.example.billing.repository.ProductRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

@Service
public class BillService {

    private final BillRepository billRepository;
    private final ProductRepository productRepository;

    public BillService(
            BillRepository billRepository,
            ProductRepository productRepository) {

        this.billRepository = billRepository;
        this.productRepository = productRepository;
    }

    @Transactional
    public Bill createBill(BillRequest request) {

        Bill bill = new Bill();

        bill.setBillDate(LocalDateTime.now());
        bill.setStatus(BillStatus.DRAFT);
        bill.setTotalAmount(BigDecimal.ZERO);

        Set<Long> productIds = new HashSet<>();

        for (BillItemRequest itemRequest : request.getItems()) {

            // Prevent duplicate products in the same bill
            if (!productIds.add(itemRequest.getProductId())) {
                throw new InvalidBillException(
                        "Same product cannot be added twice to the same bill"
                );
            }

            Product product = productRepository
                    .findById(itemRequest.getProductId())
                    .orElseThrow(() ->
                            new ProductNotFoundException(
                                    itemRequest.getProductId()
                            )
                    );

            BillItem item = new BillItem();

            item.setBill(bill);
            item.setProduct(product);
            item.setQuantity(itemRequest.getQuantity());

            // Store current product price
            item.setUnitPrice(product.getPrice());

            BigDecimal subtotal = product.getPrice()
                    .multiply(
                            BigDecimal.valueOf(
                                    itemRequest.getQuantity()
                            )
                    );

            item.setSubtotal(subtotal);

            bill.getItems().add(item);
        }

        // Calculate total amount
        BigDecimal total = bill.getItems()
                .stream()
                .map(BillItem::getSubtotal)
                .reduce(
                        BigDecimal.ZERO,
                        BigDecimal::add
                );

        bill.setTotalAmount(total);

        // Stock is NOT reduced here.
        // Stock is reduced only when the bill is finalized.

        return billRepository.save(bill);
    }

    @Transactional
    public Bill finalizeBill(Long billId) {

        Bill bill = billRepository.findById(billId)
                .orElseThrow(() ->
                        new InvalidBillException(
                                "Bill with ID " + billId + " not found"
                        )
                );

        // Prevent finalizing twice
        if (bill.getStatus() == BillStatus.FINALIZED) {
            throw new InvalidBillException(
                    "Bill is already finalized"
            );
        }

        // Check stock before reducing anything
        for (BillItem item : bill.getItems()) {

            Product product = item.getProduct();

            if (item.getQuantity() > product.getStockQuantity()) {

                throw new InsufficientStockException(
                        "Insufficient stock for product: "
                                + product.getName()
                                + ". Available: "
                                + product.getStockQuantity()
                                + ", Requested: "
                                + item.getQuantity()
                );
            }
        }

        // Reduce stock
        for (BillItem item : bill.getItems()) {

            Product product = item.getProduct();

            product.setStockQuantity(
                    product.getStockQuantity()
                            - item.getQuantity()
            );

            productRepository.save(product);
        }

        // Mark bill as finalized
        bill.setStatus(BillStatus.FINALIZED);

        return billRepository.save(bill);
    }

    public Bill getBill(Long id) {

        return billRepository.findById(id)
                .orElseThrow(() ->
                        new InvalidBillException(
                                "Bill with ID " + id + " not found"
                        )
                );
    }

    public List<Bill> getAllBills() {

        return billRepository.findAll();
    }

    public BigDecimal getDailySales(LocalDate date) {

        LocalDateTime start = date.atStartOfDay();

        LocalDateTime end =
                date.plusDays(1).atStartOfDay();

        return billRepository.getTotalSales(
                start,
                end,
                BillStatus.FINALIZED
        );
    }
}