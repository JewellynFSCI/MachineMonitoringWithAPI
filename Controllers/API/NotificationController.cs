using System.Text.RegularExpressions;
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

        #region 'Signal - Received Signal from OWS'
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
            if (model.me_support != null)
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
            return Ok(new { success = true, message = SaveNewTicket.Message });
        }
        #endregion


        #region 'Get All Machines details w/out open ticket'
        [HttpGet("MachinesInMDM")]
        [ProducesResponseType(typeof(APIResponse<List<MachineLocationDTO>>), 200)]
        [ProducesResponseType(500)]
        public async Task<IActionResult> GetAllMachine()
        {
            try
            {
                var machines = await _adminrepo.APIGetMachinesDetails();

                // Only select MachineCode
                var machineCodes = machines.Select(m => new
                {
                    machineCode = m.MachineCode
                }).ToList();

                return Ok(new APIResponse<object>
                {
                    Success = true,
                    Data = machineCodes,
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
        #endregion


        #region 'Get Machine Details'
        [HttpGet("MachinesInMDM/{machinecode}")]
        [ProducesResponseType(typeof(APIResponse<List<MachineLocationDTO>>), 200)]
        [ProducesResponseType(500)]
        public async Task<IActionResult> GetSpecificMachineDetails(string machinecode)
        {
            try
            {
                var machines = await _adminrepo.APIGetMachinesDetails();

                var machine = machines
                    .FirstOrDefault(m => m.MachineCode.Equals(machinecode, StringComparison.OrdinalIgnoreCase));

                if (machine == null)
                {
                    return NotFound(new APIResponse<MachineLocationDTO>
                    {
                        Success = false,
                        Data = null,
                        Message = $"No machine found with code {machinecode}"
                    });
                }

                return Ok(new APIResponse<MachineLocationDTO>
                {
                    Success = true,
                    Data = machine,
                    Message = "Data retrieved successfully!"
                });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new APIResponse<MachineLocationDTO>
                {
                    Success = false,
                    Data = null,
                    Message = ex.Message
                });
            }
        }
        #endregion


        #region 'Get Machines in specific plant#'
        [HttpGet("MachinesPerPlantInMDM/{plant}")]
        [ProducesResponseType(typeof(APIResponse<List<MachineCodeDTO>>), 200)]
        [ProducesResponseType(500)]
        public async Task<IActionResult> GetSpecificMachinePerPlantNo(string plant)
        {
            try
            {
                int plantno = int.Parse(Regex.Match(plant, @"\d+").Value);
                var machines = await _adminrepo.APIGetMachinesDetails();

                var machineCodes = machines
                    .Where(m => m.PlantNo == plantno)
                    .Select(m => new MachineCodeDTO { MachineCode = m.MachineCode })
                    .ToList();

                if (!machineCodes.Any())
                {
                    return NotFound(new APIResponse<List<MachineCodeDTO>>
                    {
                        Success = false,
                        Data = null,
                        Message = $"No machines found in plant {plantno}"
                    });
                }

                return Ok(new APIResponse<List<MachineCodeDTO>>
                {
                    Success = true,
                    Data = machineCodes,
                    Message = "Data retrieved successfully!"
                });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new APIResponse<List<MachineCodeDTO>>
                {
                    Success = false,
                    Data = null,
                    Message = ex.Message
                });
            }
        }
        #endregion


        #region 'Get Machine Code for Downtime OWS Form '
        [HttpGet("DT_BOFF_MachineCodes/{plant}")]
        [ProducesResponseType(typeof(APIResponse<List<MachineCodeDTO>>), 200)]
        [ProducesResponseType(500)]
        public async Task<IActionResult> Downtime_GetMachinePerPlant(string plant)
        {
            try
            {
                int plantno = int.Parse(Regex.Match(plant, @"\d+").Value);
                var machines = await _adminrepo.APIGetMachinesDetails();
                var excludedStatuses = new[] { "Machine Downtime", "BuyOff" };

                var machineCodes = machines
                                    .Where(m => m.PlantNo == plantno
                                             && !excludedStatuses.Contains(m.Status))  // <-- lowercase
                                    .Select(m => new MachineCodeDTO
                                    {
                                        MachineCode = m.MachineCode,
                                        Status = m.Status
                                    })
                                    .ToList();

                if (!machineCodes.Any())
                {
                    return NotFound(new APIResponse<List<MachineCodeDTO>>
                    {
                        Success = false,
                        Data = null,
                        Message = $"No machines found in plant {plantno}"
                    });
                }

                return Ok(new APIResponse<List<MachineCodeDTO>>
                {
                    Success = true,
                    Data = machineCodes,
                    Message = "Data retrieved successfully!"
                });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new APIResponse<List<MachineCodeDTO>>
                {
                    Success = false,
                    Data = null,
                    Message = ex.Message
                });
            }
        }
        #endregion

        #region 'Get Machine Code for Tempo OWS Form'
        [HttpGet("Tempo_MachineCodes/{plant}")]
        [ProducesResponseType(typeof(APIResponse<List<MachineCodeDTO>>), 200)]
        [ProducesResponseType(500)]
        public async Task<IActionResult> Tempo_GetMachinePerPlant(string plant)
        {
            try
            {
                int plantno = int.Parse(Regex.Match(plant, @"\d+").Value);
                var machines = await _adminrepo.APIGetMachinesDetails();

                var machineCodes = machines
                                    .Where(m => m.PlantNo == plantno)
                                    .Select(m => new MachineCodeDTO
                                    {
                                        MachineCode = m.MachineCode,
                                        Status = m.Status
                                    })
                                    .ToList();

                if (!machineCodes.Any())
                {
                    return NotFound(new APIResponse<List<MachineCodeDTO>>
                    {
                        Success = false,
                        Data = null,
                        Message = $"No machines found in plant {plantno}"
                    });
                }

                return Ok(new APIResponse<List<MachineCodeDTO>>
                {
                    Success = true,
                    Data = machineCodes,
                    Message = "Data retrieved successfully!"
                });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new APIResponse<List<MachineCodeDTO>>
                {
                    Success = false,
                    Data = null,
                    Message = ex.Message
                });
            }
        }
        #endregion
    }
}
