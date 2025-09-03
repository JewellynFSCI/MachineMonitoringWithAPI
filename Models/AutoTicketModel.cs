namespace MachineMonitoring.Models
{
    public class AutoTicketModel
    {
        public string? MachineCode { get; set; }
        public int PlantNo { get; set; }
        public int Process_Category { get; set; }
        public string? Process { get;  set;}
        public string? Area { get; set; }
        public string? detailsOfError { get; set; }
        public string? OtherDetails { get; set; }
    }

    public class FormField
    {
        public string name { get; set; }
        public string value { get; set; }
    }

    public class WorkflowRequest
    {
        public int workflowId { get; set; }
        public string requestorId { get; set; }
        public List<FormField> formData { get; set; }
    }

    public class OwsDetails
    {
        public int workflowId { get; set; }
        public string? requestorId { get; set; }
    }

    public class TicketResponse
    {
        public string? MachineCode {get; set; }
        public string? Result { get; set; }
        public string? Message { get; set; }
    }

    public class DowntimeDetails
    {
        public int ID { get; set; }
        public string? processCategory { get; set; }
        public string? downtimeDetails { get; set; }
    }
}
