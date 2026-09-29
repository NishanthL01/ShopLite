package com.example.billing.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;

import java.util.List;

public class BillRequest {

    @NotEmpty(message = "Bill must contain at least one item")
    @Valid
    private List<BillItemRequest> items;

    public BillRequest() {
    }

    public List<BillItemRequest> getItems() {
        return items;
    }

    public void setItems(List<BillItemRequest> items) {
        this.items = items;
    }
}