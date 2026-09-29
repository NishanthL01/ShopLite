package com.example.billing.controller;

import com.example.billing.dto.BillRequest;
import com.example.billing.entity.Bill;
import com.example.billing.service.BillService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.bind.annotation.CrossOrigin;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;


@CrossOrigin(origins = "http://localhost:5173")
@RestController
@RequestMapping("/api/bills")
public class BillController {

    private final BillService billService;

    public BillController(BillService billService) {
        this.billService = billService;
    }

    @PostMapping
    public ResponseEntity<Bill> createBill(
            @Valid @RequestBody BillRequest request) {

        return ResponseEntity.status(HttpStatus.CREATED)
                .body(billService.createBill(request));
    }

    @PutMapping("/{id}/finalize")
    public ResponseEntity<Bill> finalizeBill(
            @PathVariable Long id) {

        return ResponseEntity.ok(
                billService.finalizeBill(id)
        );
    }

    @GetMapping("/{id}")
    public ResponseEntity<Bill> getBill(
            @PathVariable Long id) {

        return ResponseEntity.ok(
                billService.getBill(id)
        );
    }

    @GetMapping
    public ResponseEntity<List<Bill>> getAllBills() {

        return ResponseEntity.ok(
                billService.getAllBills()
        );
    }

    @GetMapping("/sales")
    public ResponseEntity<SalesResponse> getDailySales(
            @RequestParam LocalDate date) {

        BigDecimal total =
                billService.getDailySales(date);

        return ResponseEntity.ok(
                new SalesResponse(date, total)
        );
    }

    public record SalesResponse(
            LocalDate date,
            BigDecimal totalSales
    ) {
    }
}