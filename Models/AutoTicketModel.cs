namespace MachineMonitoring.Models
{
    public class AutoTicketModel
    {
        public string? device_macaddress {  get; set; }
        public string? machine_code { get; set; }
        public string? plantno { get; set; }
        public string? process { get;  set;}
        public string? area { get; set; }
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
}
