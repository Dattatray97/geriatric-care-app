package com.geriatriccare.repository;

import com.geriatriccare.model.CareOrder;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface CareOrderRepository extends JpaRepository<CareOrder, Long> {
    List<CareOrder> findAllByOrderByCreatedAtDesc();
    List<CareOrder> findByStatus(String status);
    List<CareOrder> findByPatientName(String patientName);
    List<CareOrder> findByOrderType(String orderType);
}
