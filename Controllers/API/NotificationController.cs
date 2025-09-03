using MachineMonitoring.DataAccess.Repository;
using MachineMonitoring.Hubs;
using MachineMonitoring.Models;
using MachineMonitoring.Models.DTOs;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.SignalR;
using Microsoft.AspNetCore.SignalR.Client;
using MySqlX.XDevAPI.Common;
using Newtonsoft.Json;

namespace MachineMonitoring.Controllers.API
{
    [Route("api/[controller]")]
    [ApiController]
    public class NotificationController : ControllerBase
    {
        private readonly IHubContext<NotificationHub> _hubContext;
        private readonly AdminRepo _adminrepo;

        public NotificationController(IHubContext<NotificationHub> hubContext, AdminRepo adminrepo)
        {
            _hubContext = hubContext;
            _adminrepo = adminrepo;
        }

        [HttpPost("Signal")]
        public async Task<IActionResult> MachineMonitoringAlert([FromBody] OwsTicketDetails model)
        {
            // Combine Date and Time from OWS
            model.mc_error_buyoff_repair_date = model.date.ToDateTime(model.time);

            // Get Requestor Name
            if (model.requestor != null)
            {
                var employeename = await _adminrepo.GetEmployeeName(model.requestor);
                model.requestor = $"{employeename} ({model.requestor})";
            }

            // Get ME Support Name
            if(model.me_support != null)
            {
                var supportName = await _adminrepo.GetEmployeeName(model.me_support);
                model.me_support = $"{supportName} ({model.me_support})";
            }

            var SaveNewTicket = await _adminrepo.SaveSignal(model);
            if (!SaveNewTicket.Success)
            {
                //send data to ows(ID and Message)
                var id = model.id;
                var cancellationReason = SaveNewTicket.Message;
                await _adminrepo.SendDataToOws(id, cancellationReason);
                return BadRequest(new { success = false, message = SaveNewTicket.Message });
            }

            //Return success
            await _hubContext.Clients.All.SendAsync("ReceivedAlert", SaveNewTicket);
            return Ok(new { success = true, message = SaveNewTicket.Message});
        }


        [HttpGet("MachinesInMDM")]
        [ProducesResponseType(typeof(APIResponse<List<MachineLocationDTO>>), 200)]
        [ProducesResponseType(500)]
        public async Task<IActionResult> GetMachineDetails()
        {
            try
            {
                var machines = await _adminrepo.APIGetMachines();
                return Ok(new APIResponse<List<MachineLocationDTO>>
                {
                    Success = true,
                    Data = machines,
                    Message = "Data retrieved successfully!"
                });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new APIResponse<List<MachineLocationDTO>>
                {
                    Success = false,
                    Data = null,
                    Message = ex.Message
                });
            }
        }
    }
}
