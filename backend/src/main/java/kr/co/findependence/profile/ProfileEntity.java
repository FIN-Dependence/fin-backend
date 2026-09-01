package kr.co.findependence.profile;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.persistence.Version;

import java.time.Instant;
import java.time.LocalDate;

@Entity
@Table(name = "financial_profiles")
public class ProfileEntity {
    @Id
    @Column(length = 80)
    private String clientId;
    private String name;
    private Integer age;
    private String employment;
    private Long monthlyIncome;
    private String housingType;
    private Long deposit;
    private Long monthlyRent;
    private Long maintenance;
    private String utilities;
    private Long monthlyUtilities;
    private Long monthlyFood;
    private Long monthlyTransport;
    private Long monthlyCommunication;
    private Long insurance;
    private Long debtPayment;
    private Long cardPayment;
    private Long otherFixedCost;
    private Long emergencyFund;
    private Long movingCost;
    private Long furnishingCost;
    private Long familySupport;
    private boolean familySupportEnds;
    private LocalDate moveDate;
    private Instant createdAt;
    private Instant updatedAt;
    @Version
    private long version;

    protected ProfileEntity() {}

    public ProfileEntity(String clientId) {
        this.clientId = clientId;
        this.createdAt = Instant.now();
    }

    public void update(ProfileRequest request) {
        name = request.name();
        age = request.age();
        employment = request.employment();
        monthlyIncome = request.monthlyIncome();
        housingType = request.housingType();
        deposit = request.deposit();
        monthlyRent = request.monthlyRent();
        maintenance = request.maintenance();
        utilities = request.utilities();
        monthlyUtilities = request.monthlyUtilities();
        monthlyFood = request.monthlyFood();
        monthlyTransport = request.monthlyTransport();
        monthlyCommunication = request.monthlyCommunication();
        insurance = request.insurance();
        debtPayment = request.debtPayment();
        cardPayment = request.cardPayment();
        otherFixedCost = request.otherFixedCost();
        emergencyFund = request.emergencyFund();
        movingCost = request.movingCost();
        furnishingCost = request.furnishingCost();
        familySupport = request.familySupport();
        familySupportEnds = request.familySupportEnds();
        moveDate = request.moveDate();
        updatedAt = Instant.now();
    }

    public String getClientId() { return clientId; }
    public String getName() { return name; }
    public Integer getAge() { return age; }
    public String getEmployment() { return employment; }
    public Long getMonthlyIncome() { return monthlyIncome; }
    public String getHousingType() { return housingType; }
    public Long getDeposit() { return deposit; }
    public Long getMonthlyRent() { return monthlyRent; }
    public Long getMaintenance() { return maintenance; }
    public String getUtilities() { return utilities; }
    public Long getMonthlyUtilities() { return monthlyUtilities; }
    public Long getMonthlyFood() { return monthlyFood; }
    public Long getMonthlyTransport() { return monthlyTransport; }
    public Long getMonthlyCommunication() { return monthlyCommunication; }
    public Long getInsurance() { return insurance; }
    public Long getDebtPayment() { return debtPayment; }
    public Long getCardPayment() { return cardPayment; }
    public Long getOtherFixedCost() { return otherFixedCost; }
    public Long getEmergencyFund() { return emergencyFund; }
    public Long getMovingCost() { return movingCost; }
    public Long getFurnishingCost() { return furnishingCost; }
    public Long getFamilySupport() { return familySupport; }
    public boolean isFamilySupportEnds() { return familySupportEnds; }
    public LocalDate getMoveDate() { return moveDate; }
    public Instant getCreatedAt() { return createdAt; }
    public Instant getUpdatedAt() { return updatedAt; }
}
