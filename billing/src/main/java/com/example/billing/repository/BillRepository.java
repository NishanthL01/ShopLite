package com.example.billing.repository;

import com.example.billing.entity.Bill;
import com.example.billing.entity.BillStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

public interface BillRepository extends JpaRepository<Bill, Long> {

    List<Bill> findByBillDateBetween(
            LocalDateTime start,
            LocalDateTime end
    );

    @Query("""
        SELECT COALESCE(SUM(b.totalAmount), 0)
        FROM Bill b
        WHERE b.billDate >= :start
          AND b.billDate < :end
          AND b.status = :status
    """)
    BigDecimal getTotalSales(
            @Param("start") LocalDateTime start,
            @Param("end") LocalDateTime end,
            @Param("status") BillStatus status
    );
}